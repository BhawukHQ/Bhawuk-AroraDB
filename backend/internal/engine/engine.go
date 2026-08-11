package engine

// StorageEngine defines the abstract storage interface for AroraDB.
// By coding against this interface, we implement the Dependency Inversion Principle,
// allowing us to swap the underlying engine (e.g., Bitcask, LSM-Tree, or B+Tree)
// without modifying the API layer or the Document Collection manager.
type StorageEngine interface {
	// Get retrieves the value associated with the key. Returns nil, nil if key does not exist.
	Get(key []byte) ([]byte, error)

	// Put stores a key-value pair in the database.
	Put(key []byte, value []byte) error

	// Delete removes a key from the database by appending a tombstone record.
	Delete(key []byte) error

	// Scan returns all active key-value pairs matching a prefix string.
	Scan(prefix string) ([]KeyVal, error)

	// Stats returns database telemetry: total active keys, db size in bytes, and data file count.
	Stats() (int, int64, int)

	// Compact triggers manual log merging, removing deleted keys and obsolete values.
	Compact() error

	// CompactionRatio calculates the ratio of active data size to total data file size.
	CompactionRatio() float64

	// Close gracefully flushes buffers and closes all data file descriptors.
	Close() error
}
