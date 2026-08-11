package vector

// HNSW represents a simple mock Vector HNSW index.
type HNSW struct {
}

// New creates a new HNSW index.
func New() *HNSW {
	return &HNSW{}
}

// SearchKNN returns k mock distances for the given vector.
func (h *HNSW) SearchKNN(vector []float64, k int) []float64 {
	distances := make([]float64, k)
	for i := 0; i < k; i++ {
		distances[i] = float64(i) * 0.5
	}
	return distances
}
