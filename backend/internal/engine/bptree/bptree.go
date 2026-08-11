package bptree

import "sync"

// BPTree represents an in-memory B+ Tree index (simplified).
type BPTree struct {
	mu   sync.RWMutex
	data map[int]string
}

// New creates a new BPTree index.
func New() *BPTree {
	return &BPTree{
		data: make(map[int]string),
	}
}

// Insert adds a key-value pair to the tree.
func (t *BPTree) Insert(key int, value string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.data[key] = value
}

// Search retrieves a value by its key.
func (t *BPTree) Search(key int) (string, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	val, ok := t.data[key]
	return val, ok
}

// Range returns all values whose keys fall in the inclusive range [startKey, endKey].
func (t *BPTree) Range(startKey, endKey int) []string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	var results []string
	for k, v := range t.data {
		if k >= startKey && k <= endKey {
			results = append(results, v)
		}
	}
	return results
}
