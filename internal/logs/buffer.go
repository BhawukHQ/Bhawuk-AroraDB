package logs

import (
	"io"
	"strings"
	"sync"
	"time"
)

type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Message   string    `json:"message"`
}

type Buffer struct {
	mu       sync.RWMutex
	capacity int
	entries  []LogEntry
	index    int // points to the next write position
	count    int // total elements in buffer
}

var globalBuffer *Buffer

func InitBuffer(capacity int) *Buffer {
	if capacity <= 0 {
		capacity = 500
	}
	globalBuffer = &Buffer{
		capacity: capacity,
		entries:  make([]LogEntry, capacity),
	}
	return globalBuffer
}

func GetBuffer() *Buffer {
	if globalBuffer == nil {
		InitBuffer(500)
	}
	return globalBuffer
}

// Write implements io.Writer to capture log outputs.
func (b *Buffer) Write(p []byte) (n int, err error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	msg := strings.TrimSpace(string(p))
	if msg != "" {
		b.entries[b.index] = LogEntry{
			Timestamp: time.Now(),
			Message:   msg,
		}
		b.index = (b.index + 1) % b.capacity
		if b.count < b.capacity {
			b.count++
		}
	}

	return len(p), nil
}

// GetEntries returns all logs sorted from oldest to newest.
func (b *Buffer) GetEntries() []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make([]LogEntry, b.count)
	if b.count < b.capacity {
		// Buffer is not full yet, copy from index 0 to b.index
		copy(result, b.entries[:b.count])
	} else {
		// Buffer wrapped, copy in order: [index ... capacity-1] then [0 ... index-1]
		firstPart := b.capacity - b.index
		copy(result[:firstPart], b.entries[b.index:])
		copy(result[firstPart:], b.entries[:b.index])
	}
	return result
}

// HookWriter redirects standard log output to write to both stdout/stderr and our buffer.
func HookWriter(stdWriter io.Writer) io.Writer {
	buf := GetBuffer()
	return io.MultiWriter(stdWriter, buf)
}
