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
	// Simple type checks
	switch qv := queryVal.(type) {
	case float64:
		dvFloat, ok := docVal.(float64)
		if ok {
			return dvFloat == qv
		}
		// If docVal is an int, convert it
		dvInt, ok := docVal.(int)
		if ok {
			return float64(dvInt) == qv
		}
	case string:
		dvStr, ok := docVal.(string)
		if ok {
			return dvStr == qv
		}
	case bool:
		dvBool, ok := docVal.(bool)
		if ok {
			return dvBool == qv
		}
	case int:
		dvInt, ok := docVal.(int)
		if ok {
			return dvInt == qv
		}
		dvFloat, ok := docVal.(float64)
		if ok {
			return dvFloat == float64(qv)
		}
	case nil:
		return docVal == nil
	}

	// Fallback to string comparison for unhandled types
	return fmt.Sprintf("%v", docVal) == fmt.Sprintf("%v", queryVal)
}
