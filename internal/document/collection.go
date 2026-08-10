package document

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
)

var ErrInvalidJSON = errors.New("invalid JSON document")

type CollectionManager struct {
	db engine.StorageEngine
}

func NewCollectionManager(db engine.StorageEngine) *CollectionManager {
	return &CollectionManager{db: db}
}

// Insert saves a JSON document into the specified collection.
func (cm *CollectionManager) Insert(collection string, docID string, docJSON []byte) error {
	// Validate JSON
	var temp map[string]interface{}
	if err := json.Unmarshal(docJSON, &temp); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidJSON, err)
	}

	// Always inject/override the "_id" field in the document if not present or different
	if _, ok := temp["_id"]; !ok || temp["_id"] != docID {
		temp["_id"] = docID
		updatedJSON, err := json.Marshal(temp)
		if err == nil {
			docJSON = updatedJSON
		}
	}

	key := fmt.Sprintf("doc:%s:%s", collection, docID)
	return cm.db.Put([]byte(key), docJSON)
}

// Get retrieves a document by ID.
func (cm *CollectionManager) Get(collection string, docID string) ([]byte, error) {
	key := fmt.Sprintf("doc:%s:%s", collection, docID)
	return cm.db.Get([]byte(key))
}

// Delete removes a document.
func (cm *CollectionManager) Delete(collection string, docID string) error {
	key := fmt.Sprintf("doc:%s:%s", collection, docID)
	return cm.db.Delete([]byte(key))
}

// ListCollections returns a list of all unique collection names.
func (cm *CollectionManager) ListCollections() ([]string, error) {
	kvs, err := cm.db.Scan("doc:")
	if err != nil {
		return nil, err
	}

	colMap := make(map[string]bool)
	for _, kv := range kvs {
		parts := strings.SplitN(kv.Key, ":", 3)
		if len(parts) >= 2 {
			colMap[parts[1]] = true
		}
	}

	var collections []string
	for col := range colMap {
		collections = append(collections, col)
	}
	return collections, nil
}

// Query searches for documents matching filters.
// Supported filter structure: {"user.profile.age": 30, "status": "active"}
func (cm *CollectionManager) Query(collection string, filter map[string]interface{}) ([]map[string]interface{}, error) {
	prefix := fmt.Sprintf("doc:%s:", collection)
	kvs, err := cm.db.Scan(prefix)
	if err != nil {
		return nil, err
	}

	var matchedDocs []map[string]interface{}

	for _, kv := range kvs {
		var doc map[string]interface{}
		if err := json.Unmarshal([]byte(kv.Value), &doc); err != nil {
			continue // Skip invalid stored JSON
		}

		// Evaluate filters
		isMatch := true
		for queryKey, queryVal := range filter {
			val, found := getNestedValue(doc, queryKey)
			if !found || !matches(val, queryVal) {
				isMatch = false
				break
			}
		}

		if isMatch {
			matchedDocs = append(matchedDocs, doc)
		}
	}

	return matchedDocs, nil
}

// ListAll returns all documents in a collection.
func (cm *CollectionManager) ListAll(collection string) ([]map[string]interface{}, error) {
	return cm.Query(collection, nil)
}

// Helper: Traverse map using dot notation (e.g. "profile.address.city")
func getNestedValue(obj interface{}, path string) (interface{}, bool) {
	parts := strings.Split(path, ".")
	var current interface{} = obj

	for _, part := range parts {
		m, ok := current.(map[string]interface{})
		if !ok {
			return nil, false
		}
		val, exists := m[part]
		if !exists {
			return nil, false
		}
		current = val
	}
	return current, true
}

// Helper: check if document value matches query criteria
func matches(docVal interface{}, queryVal interface{}) bool {
	// If queryVal is a map, check if it contains query operators
	qMap, ok := queryVal.(map[string]interface{})
	if ok {
		hasOperator := false
		for k := range qMap {
			if strings.HasPrefix(k, "$") {
				hasOperator = true
				break
			}
		}

		if hasOperator {
			for op, targetVal := range qMap {
				switch op {
				case "$eq":
					if !compareValues(docVal, targetVal, "==") {
						return false
					}
				case "$ne":
					if !compareValues(docVal, targetVal, "!=") {
						return false
					}
				case "$gt":
					if !compareValues(docVal, targetVal, ">") {
						return false
					}
				case "$gte":
					if !compareValues(docVal, targetVal, ">=") {
						return false
					}
				case "$lt":
					if !compareValues(docVal, targetVal, "<") {
						return false
					}
				case "$lte":
					if !compareValues(docVal, targetVal, "<=") {
						return false
					}
				case "$in":
					targets, ok := targetVal.([]interface{})
					if !ok {
						return false
					}
					matched := false
					for _, t := range targets {
						if compareValues(docVal, t, "==") {
							matched = true
							break
						}
					}
					if !matched {
						return false
					}
				case "$contains":
					switch dv := docVal.(type) {
					case string:
						tvStr := fmt.Sprintf("%v", targetVal)
						if !strings.Contains(strings.ToLower(dv), strings.ToLower(tvStr)) {
							return false
						}
					case []interface{}:
						matched := false
						for _, item := range dv {
							if compareValues(item, targetVal, "==") {
								matched = true
								break
							}
						}
						if !matched {
							return false
						}
					default:
						return false
					}
				}
			}
			return true
		}
	}

	return compareValues(docVal, queryVal, "==")
}

func compareValues(val1, val2 interface{}, op string) bool {
	if val1 == nil || val2 == nil {
		if op == "==" {
			return val1 == val2
		} else if op == "!=" {
			return val1 != val2
		}
		return false
	}

	// Try numeric comparison
	n1, isNum1 := toFloat64(val1)
	n2, isNum2 := toFloat64(val2)
	if isNum1 && isNum2 {
		switch op {
		case "==": return n1 == n2
		case "!=": return n1 != n2
		case ">":  return n1 > n2
		case ">=": return n1 >= n2
		case "<":  return n1 < n2
		case "<=": return n1 <= n2
		}
	}

	// Boolean comparison
	b1, isBool1 := val1.(bool)
	b2, isBool2 := val2.(bool)
	if isBool1 && isBool2 {
		if op == "==" {
			return b1 == b2
		} else if op == "!=" {
			return b1 != b2
		}
		return false
	}

	// String comparison (fallback)
	s1 := strings.ToLower(fmt.Sprintf("%v", val1))
	s2 := strings.ToLower(fmt.Sprintf("%v", val2))
	switch op {
	case "==": return s1 == s2
	case "!=": return s1 != s2
	case ">":  return s1 > s2
	case ">=": return s1 >= s2
	case "<":  return s1 < s2
	case "<=": return s1 <= s2
	}
	return false
}

func toFloat64(val interface{}) (float64, bool) {
	switch v := val.(type) {
	case float64: return v, true
	case float32: return float64(v), true
	case int:     return float64(v), true
	case int64:   return float64(v), true
	case int32:   return float64(v), true
	case uint32:  return float64(v), true
	case uint64:  return float64(v), true
	}
	return 0, false
}
