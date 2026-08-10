package sql

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var (
	ErrInvalidSQL       = errors.New("syntax error: invalid SQL statement")
	ErrUnsupportedQuery = errors.New("syntax error: unsupported SQL keyword")
)

// ParseSQL parses a basic SQL string and compiles it into an AST node.
func ParseSQL(query string) (SQLStatement, error) {
	// Simple cleanup: remove trailing semicolon and trim spaces
	query = strings.TrimSpace(query)
	if strings.HasSuffix(query, ";") {
		query = strings.TrimSuffix(query, ";")
	}
	query = strings.TrimSpace(query)

	if query == "" {
		return nil, ErrInvalidSQL
	}

	// Tokenize input query by keywords
	tokens := tokenize(query)
	if len(tokens) == 0 {
		return nil, ErrInvalidSQL
	}

	firstToken := strings.ToUpper(tokens[0])
	switch firstToken {
	case "CREATE":
		return parseCreate(tokens)
	case "INSERT":
		return parseInsert(tokens)
	case "SELECT":
		return parseSelect(tokens)
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedQuery, tokens[0])
	}
}

// Tokenizer that splits query while keeping parenthesized lists and quoted strings together
func tokenize(query string) []string {
	var tokens []string
	var current strings.Builder
	inQuotes := false
	var quoteChar rune

	runes := []rune(query)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if (r == '\'' || r == '"') {
			if !inQuotes {
				inQuotes = true
				quoteChar = r
				current.WriteRune(r)
			} else if r == quoteChar {
				inQuotes = false
				current.WriteRune(r)
				tokens = append(tokens, current.String())
				current.Reset()
			} else {
				current.WriteRune(r)
			}
			continue
		}

		if inQuotes {
			current.WriteRune(r)
			continue
		}

		// Split on delimiters but keep them if symbols
		if r == '(' || r == ')' || r == ',' || r == '=' || r == '>' || r == '<' || r == '!' {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			
			// Handle double character operators (e.g. !=, >=, <=)
			if r == '!' && i+1 < len(runes) && runes[i+1] == '=' {
				tokens = append(tokens, "!=")
				i++
			} else if r == '>' && i+1 < len(runes) && runes[i+1] == '=' {
				tokens = append(tokens, ">=")
				i++
			} else if r == '<' && i+1 < len(runes) && runes[i+1] == '=' {
				tokens = append(tokens, "<=")
				i++
			} else {
				tokens = append(tokens, string(r))
			}
			continue
		}

		if r == ' ' || r == '\t' || r == '\n' || r == '\r' {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			continue
		}

		current.WriteRune(r)
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

// CREATE TABLE <name> ( col type, col2 type2, ... )
func parseCreate(tokens []string) (SQLStatement, error) {
	if len(tokens) < 6 || strings.ToUpper(tokens[1]) != "TABLE" {
		return nil, fmt.Errorf("%w: expected 'CREATE TABLE <table_name>'", ErrInvalidSQL)
	}

	tableName := tokens[2]
	if tokens[3] != "(" {
		return nil, fmt.Errorf("%w: expected '(' after table name", ErrInvalidSQL)
	}

	var columns []ColumnDefinition
	i := 4
	for i < len(tokens) {
		if tokens[i] == ")" {
			break
		}
		
		colName := tokens[i]
		i++
		if i >= len(tokens) {
			return nil, fmt.Errorf("%w: missing column type definition", ErrInvalidSQL)
		}
		colType := strings.ToUpper(tokens[i])
		i++

		columns = append(columns, ColumnDefinition{
			Name: colName,
			Type: colType,
		})

		if i < len(tokens) && tokens[i] == "," {
			i++
		}
	}

	if i >= len(tokens) || tokens[i] != ")" {
		return nil, fmt.Errorf("%w: missing closing parenthese ')' in table definition", ErrInvalidSQL)
	}

	return &CreateTableStatement{
		TableName: tableName,
		Columns:   columns,
	}, nil
}

// INSERT INTO <name> VALUES ( val1, val2, ... )
func parseInsert(tokens []string) (SQLStatement, error) {
	if len(tokens) < 7 || strings.ToUpper(tokens[1]) != "INTO" {
		return nil, fmt.Errorf("%w: expected 'INSERT INTO <table_name>'", ErrInvalidSQL)
	}

	tableName := tokens[2]
	if strings.ToUpper(tokens[3]) != "VALUES" || tokens[4] != "(" {
		return nil, fmt.Errorf("%w: expected 'VALUES (' after table name", ErrInvalidSQL)
	}

	var values []interface{}
	i := 5
	for i < len(tokens) {
		if tokens[i] == ")" {
			break
		}

		rawVal := tokens[i]
		i++

		parsedVal := parseLiteral(rawVal)
		values = append(values, parsedVal)

		if i < len(tokens) && tokens[i] == "," {
			i++
		}
	}

	if i >= len(tokens) || tokens[i] != ")" {
		return nil, fmt.Errorf("%w: missing closing parenthese ')' in values definition", ErrInvalidSQL)
	}

	return &InsertStatement{
		TableName: tableName,
		Values:    values,
	}, nil
}

// SELECT cols FROM table [WHERE field op val] [LIMIT limit]
func parseSelect(tokens []string) (SQLStatement, error) {
	if len(tokens) < 4 {
		return nil, fmt.Errorf("%w: SELECT query too short", ErrInvalidSQL)
	}

	// 1. Fields
	i := 1
	var fields []string
	for i < len(tokens) {
		if strings.ToUpper(tokens[i]) == "FROM" {
			break
		}
		if tokens[i] != "," {
			fields = append(fields, tokens[i])
		}
		i++
	}

	if i >= len(tokens) || strings.ToUpper(tokens[i]) != "FROM" {
		return nil, fmt.Errorf("%w: expected 'FROM' keyword", ErrInvalidSQL)
	}
	i++ // skip FROM

	if i >= len(tokens) {
		return nil, fmt.Errorf("%w: expected table name after FROM", ErrInvalidSQL)
	}
	tableName := tokens[i]
	i++

	stmt := &SelectStatement{
		TableName: tableName,
		Fields:    fields,
		Limit:     -1,
	}

	// 2. WHERE and LIMIT
	for i < len(tokens) {
		kw := strings.ToUpper(tokens[i])
		if kw == "WHERE" {
			if i+3 >= len(tokens) {
				return nil, fmt.Errorf("%w: invalid WHERE clause syntax", ErrInvalidSQL)
			}
			field := tokens[i+1]
			op := tokens[i+2]
			valRaw := tokens[i+3]
			i += 4

			stmt.Where = &WhereClause{
				Field:    field,
				Operator: op,
				Value:    parseLiteral(valRaw),
			}
		} else if kw == "LIMIT" {
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("%w: missing value for LIMIT clause", ErrInvalidSQL)
			}
			limitVal, err := strconv.Atoi(tokens[i+1])
			if err != nil {
				return nil, fmt.Errorf("%w: invalid value for LIMIT: %s", ErrInvalidSQL, tokens[i+1])
			}
			stmt.Limit = limitVal
			i += 2
		} else {
			return nil, fmt.Errorf("%w: unexpected keyword %s", ErrInvalidSQL, tokens[i])
		}
	}

	return stmt, nil
}

// Convert string literal tokens into types (e.g. string, float, bool)
func parseLiteral(s string) interface{} {
	if (strings.HasPrefix(s, "'") && strings.HasSuffix(s, "'")) || 
	   (strings.HasPrefix(s, "\"") && strings.HasSuffix(s, "\"")) {
		return s[1 : len(s)-1]
	}

	if strings.ToLower(s) == "true" {
		return true
	}
	if strings.ToLower(s) == "false" {
		return false
	}
	if strings.ToLower(s) == "null" {
		return nil
	}

	// Try numeric float
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f
	}

	return s
}
