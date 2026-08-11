package inverted

import "sync"

// InvertedIndex represents a basic full-text inverted index.
type InvertedIndex struct {
	mu   sync.RWMutex
	data map[string][]string
}

// New creates a new InvertedIndex.
func New() *InvertedIndex {
	return &InvertedIndex{
		data: make(map[string][]string),
	}
}

// AddDocument indexes words for a given document ID.
func (idx *InvertedIndex) AddDocument(docID string, words []string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	for _, word := range words {
		idx.data[word] = append(idx.data[word], docID)
	}
}

// Search returns a list of docIDs containing the specified word.
func (idx *InvertedIndex) Search(word string) []string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.data[word]
}
