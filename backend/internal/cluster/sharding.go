package cluster

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"sort"
	"sync"
)

// ConsistentHash represents a ring of nodes
type ConsistentHash struct {
	mu       sync.RWMutex
	nodes    map[string]bool
	ring     []uint32
	ringMap  map[uint32]string
	replicas int
}

// NewConsistentHash creates a new ConsistentHash ring
func NewConsistentHash(replicas int) *ConsistentHash {
	if replicas <= 0 {
		replicas = 3 // default replicas per node
	}
	return &ConsistentHash{
		nodes:    make(map[string]bool),
		ringMap:  make(map[uint32]string),
		replicas: replicas,
	}
}

// AddNode adds a new node to the ring
func (ch *ConsistentHash) AddNode(node string) {
	ch.mu.Lock()
	defer ch.mu.Unlock()

	if ch.nodes[node] {
		return
	}

	ch.nodes[node] = true
	for i := 0; i < ch.replicas; i++ {
		hash := ch.hashKey(node, i)
		ch.ring = append(ch.ring, hash)
		ch.ringMap[hash] = node
	}
	
	// Sort the ring to maintain consistent ordering
	sort.Slice(ch.ring, func(i, j int) bool {
		return ch.ring[i] < ch.ring[j]
	})
}

// RemoveNode removes a node from the ring
func (ch *ConsistentHash) RemoveNode(node string) {
	ch.mu.Lock()
	defer ch.mu.Unlock()

	if !ch.nodes[node] {
		return
	}

	delete(ch.nodes, node)
	for i := 0; i < ch.replicas; i++ {
		hash := ch.hashKey(node, i)
		delete(ch.ringMap, hash)
	}

	// Rebuild the ring slice without the removed node's hashes
	var newRing []uint32
	for _, h := range ch.ring {
		if _, exists := ch.ringMap[h]; exists {
			newRing = append(newRing, h)
		}
	}
	ch.ring = newRing
}

// GetNode maps a string key to a specific node
func (ch *ConsistentHash) GetNode(key string) string {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	if len(ch.ring) == 0 {
		return ""
	}

	// Hash the key using index 0 (could use no index, but keeps it consistent with node hashes)
	hash := ch.hashKey(key, 0)
	idx := sort.Search(len(ch.ring), func(i int) bool {
		return ch.ring[i] >= hash
	})

	// Wrap around to the first node if the hash is larger than the last node's hash
	if idx == len(ch.ring) {
		idx = 0
	}

	return ch.ringMap[ch.ring[idx]]
}

// hashKey generates a consistent hash for a given key and replica index
func (ch *ConsistentHash) hashKey(key string, index int) uint32 {
	data := fmt.Sprintf("%s#%d", key, index)
	hashBytes := sha256.Sum256([]byte(data))
	return binary.BigEndian.Uint32(hashBytes[:4])
}

// GetNodes returns all currently registered nodes
func (ch *ConsistentHash) GetNodes() []string {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	var nodes []string
	for node := range ch.nodes {
		nodes = append(nodes, node)
	}
	return nodes
}
