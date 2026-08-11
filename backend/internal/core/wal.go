package core

import (
	"encoding/binary"
	"fmt"
	"os"
	"sync"
	"time"
)

type WALEntryType byte

const (
	EntryPut WALEntryType = 1
	EntryDel WALEntryType = 2
)

type WALEntry struct {
	Type      WALEntryType
	Timestamp int64
	Key       []byte
	Value     []byte
}

type WriteAheadLog struct {
	file *os.File
	mu   sync.Mutex
}

func NewWAL(path string) (*WriteAheadLog, error) {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open WAL file: %w", err)
	}

	return &WriteAheadLog{
		file: file,
	}, nil
}

func (w *WriteAheadLog) WritePut(key, value []byte) error {
	return w.write(EntryPut, key, value)
}

func (w *WriteAheadLog) WriteDelete(key []byte) error {
	return w.write(EntryDel, key, nil)
}

func (w *WriteAheadLog) write(entryType WALEntryType, key, value []byte) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	ts := time.Now().UnixNano()

	// Format: Type(1) | Timestamp(8) | KeyLen(4) | Key | ValLen(4) | Val
	buf := make([]byte, 1+8+4+len(key)+4+len(value))
	buf[0] = byte(entryType)
	binary.LittleEndian.PutUint64(buf[1:9], uint64(ts))
	binary.LittleEndian.PutUint32(buf[9:13], uint32(len(key)))
	copy(buf[13:13+len(key)], key)
	
	offset := 13 + len(key)
	binary.LittleEndian.PutUint32(buf[offset:offset+4], uint32(len(value)))
	copy(buf[offset+4:], value)

	if _, err := w.file.Write(buf); err != nil {
		return err
	}

	// fsync for ACID durability
	return w.file.Sync()
}

func (w *WriteAheadLog) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.file.Close()
}
