package sql

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
)

type SQLResult struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
	Message string          `json:"message"`
}

type SchemaInfo struct {
	TableName string             `json:"table_name"`
	Columns   []ColumnDefinition `json:"columns"`
	RowCount  int                `json:"row_count"`
}

// ExecuteStatement compiles and runs a SQL query string on the storage engine.
func ExecuteStatement(db engine.StorageEngine, query string) (*SQLResult, error) {
	stmt, err := ParseSQL(query)
	if err != nil {
		return nil, err
	}

	switch s := stmt.(type) {
	case *CreateTableStatement:
		return executeCreate(db, s)
	case *InsertStatement:
		return executeInsert(db, s)
	case *SelectStatement:
		return executeSelect(db, s)
	default:
		return nil, fmt.Errorf("unhandled AST node statement type")
	}
}

// ListTables returns metadata definitions for all SQL tables.
func ListTables(db engine.StorageEngine) ([]SchemaInfo, error) {
	kvs, err := db.Scan("sql:schema:")
	if err != nil {
		return nil, err
	}

	var tables []SchemaInfo
	for _, kv := range kvs {
		parts := strings.SplitN(kv.Key, ":", 3)
		if len(parts) < 3 {
			continue
		}
		tableName := parts[2]

		var cols []ColumnDefinition
		if err := json.Unmarshal([]byte(kv.Value), &cols); err != nil {
			continue
		}

		// Read row count sequence
		seqVal, err := db.Get([]byte(fmt.Sprintf("sql:seq:%s", tableName)))
		rowCount := 0
		if err == nil && seqVal != nil {
			if count, err := strconv.Atoi(string(seqVal)); err == nil {
				rowCount = count
			}
		}

		tables = append(tables, SchemaInfo{
			TableName: tableName,
			Columns:   cols,
			RowCount:  rowCount,
		})
	}
	return tables, nil
}

func executeCreate(db engine.StorageEngine, s *CreateTableStatement) (*SQLResult, error) {
	schemaKey := []byte(fmt.Sprintf("sql:schema:%s", s.TableName))
	
	// Check if table already exists
	exists, err := db.Get(schemaKey)
	if err != nil {
		return nil, err
	}
	if exists != nil {
		return nil, fmt.Errorf("table '%s' already exists", s.TableName)
	}

	schemaJSON, err := json.Marshal(s.Columns)
	if err != nil {
		return nil, err
	}

	if err := db.Put(schemaKey, schemaJSON); err != nil {
		return nil, err
	}

	// Initialize row sequence counter
	seqKey := []byte(fmt.Sprintf("sql:seq:%s", s.TableName))
	if err := db.Put(seqKey, []byte("0")); err != nil {
		return nil, err
	}

	return &SQLResult{
		Message: fmt.Sprintf("Table '%s' created successfully.", s.TableName),
	}, nil
}

func executeInsert(db engine.StorageEngine, s *InsertStatement) (*SQLResult, error) {
	schemaKey := []byte(fmt.Sprintf("sql:schema:%s", s.TableName))
	schemaBytes, err := db.Get(schemaKey)
	if err != nil {
		return nil, err
	}
	if schemaBytes == nil {
		return nil, fmt.Errorf("table '%s' not found", s.TableName)
	}

	var cols []ColumnDefinition
	if err := json.Unmarshal(schemaBytes, &cols); err != nil {
		return nil, err
	}

	if len(s.Values) != len(cols) {
		return nil, fmt.Errorf("column count mismatch: expected %d values, got %d", len(cols), len(s.Values))
	}

	// Read current sequence ID
	seqKey := []byte(fmt.Sprintf("sql:seq:%s", s.TableName))
	seqBytes, err := db.Get(seqKey)
	if err != nil {
		return nil, err
	}
	seqID := 0
	if seqBytes != nil {
		if id, err := strconv.Atoi(string(seqBytes)); err == nil {
			seqID = id
		}
	}

	// Map values to columns
	rowMap := make(map[string]interface{})
	for idx, col := range cols {
		rowMap[col.Name] = s.Values[idx]
	}

	rowJSON, err := json.Marshal(rowMap)
	if err != nil {
		return nil, err
	}

	// Store row data
	rowKey := []byte(fmt.Sprintf("sql:row:%s:%d", s.TableName, seqID))
	if err := db.Put(rowKey, rowJSON); err != nil {
		return nil, err
	}

	// Increment sequence counter
	nextSeqStr := strconv.Itoa(seqID + 1)
	if err := db.Put(seqKey, []byte(nextSeqStr)); err != nil {
		return nil, err
	}

	return &SQLResult{
		Message: fmt.Sprintf("1 row inserted (Row index ID: %d).", seqID),
	}, nil
}

func executeSelect(db engine.StorageEngine, s *SelectStatement) (*SQLResult, error) {
	schemaKey := []byte(fmt.Sprintf("sql:schema:%s", s.TableName))
	schemaBytes, err := db.Get(schemaKey)
	if err != nil {
		return nil, err
	}
	if schemaBytes == nil {
		return nil, fmt.Errorf("table '%s' not found", s.TableName)
	}

	var cols []ColumnDefinition
	if err := json.Unmarshal(schemaBytes, &cols); err != nil {
		return nil, err
	}

	// Get row count sequence
	seqKey := []byte(fmt.Sprintf("sql:seq:%s", s.TableName))
	seqBytes, err := db.Get(seqKey)
	if err != nil {
		return nil, err
	}
	maxSeq := 0
	if seqBytes != nil {
		if seq, err := strconv.Atoi(string(seqBytes)); err == nil {
			maxSeq = seq
		}
	}

	// Determine output columns
	var outputCols []string
	if len(s.Fields) == 1 && s.Fields[0] == "*" {
		for _, col := range cols {
			outputCols = append(outputCols, col.Name)
		}
	} else {
		// Verify selected columns exist
		for _, f := range s.Fields {
			found := false
			for _, col := range cols {
				if strings.ToLower(col.Name) == strings.ToLower(f) {
					outputCols = append(outputCols, col.Name)
					found = true
					break
				}
			}
			if !found {
				return nil, fmt.Errorf("column '%s' not found in table '%s'", f, s.TableName)
			}
		}
	}

	var outputRows [][]interface{}
	limitCounter := 0

	// Read and evaluate rows
	for rIdx := 0; rIdx < maxSeq; rIdx++ {
		if s.Limit != -1 && limitCounter >= s.Limit {
			break
		}

		rowKey := []byte(fmt.Sprintf("sql:row:%s:%d", s.TableName, rIdx))
		rowBytes, err := db.Get(rowKey)
		if err != nil || rowBytes == nil {
			continue // Row deleted or missing
		}

		var rowMap map[string]interface{}
		if err := json.Unmarshal(rowBytes, &rowMap); err != nil {
			continue
		}

		// Evaluate WHERE clause
		if s.Where != nil {
			val, exists := rowMap[s.Where.Field]
			if !exists {
				continue // Field does not exist in row
			}
			if !compareSQLValues(val, s.Where.Value, s.Where.Operator) {
				continue // Filter match failed
			}
		}

		// Build row projection values in correct column order
		var projectedRow []interface{}
		for _, colName := range outputCols {
			projectedRow = append(projectedRow, rowMap[colName])
		}

		outputRows = append(outputRows, projectedRow)
		limitCounter++
	}

	return &SQLResult{
		Columns: outputCols,
		Rows:    outputRows,
		Message: fmt.Sprintf("%d rows selected.", len(outputRows)),
	}, nil
}

func compareSQLValues(val1, val2 interface{}, op string) bool {
	if val1 == nil || val2 == nil {
		if op == "=" {
			return val1 == val2
		} else if op == "!=" {
			return val1 != val2
		}
		return false
	}

	// Try numeric float comparison
	n1, isNum1 := toFloat64(val1)
	n2, isNum2 := toFloat64(val2)
	if isNum1 && isNum2 {
		switch op {
		case "=":  return n1 == n2
		case "!=": return n1 != n2
		case ">":  return n1 > n2
		case ">=": return n1 >= n2
		case "<":  return n1 < n2
		case "<=": return n1 <= n2
		}
	}

	// String comparison
	s1 := strings.ToLower(fmt.Sprintf("%v", val1))
	s2 := strings.ToLower(fmt.Sprintf("%v", val2))
	switch op {
	case "=":  return s1 == s2
	case "!=": return s1 != s2
	case ">":  return s1 > s2
	case ">=": return s1 >= s2
	case "<":  return s1 < s2
	case "<=": return s1 <= s2
	}
	return false
}

func toFloat64(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case string:
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}
