package core

// Iterator represents a way to scan over a range of keys.
type Iterator interface {
	Valid() bool
	Next()
	Key() []byte
	Value() []byte
	Close() error
}

// StorageEngine defines the explicit core interfaces for storage dependency inversion.
type StorageEngine interface {
	Get(key []byte) ([]byte, error)
	Put(key []byte, value []byte) error
	Delete(key []byte) error
	Scan(startKey, endKey []byte) (Iterator, error)
	Sync() error
}
