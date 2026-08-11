package engine

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

const (
	DataFilePrefix = "aroradb.data."
	DefaultMaxFileSize = 10 * 1024 * 1024 // 10MB
)

type KeyMetadata struct {
	FileID      uint32
	ValueSize   uint32
	ValueOffset int64
	Timestamp   uint64
}

type KeyVal struct {
	Key   string
	Value string
}

type Engine struct {
	mu           sync.RWMutex
	dbDir        string
	maxFileSize  int64
	activeFile   *os.File
	activeFileID uint32
	writeOffset  int64
	readFiles    map[uint32]*os.File
	keyDir       map[string]KeyMetadata
	isClosed     bool
}

// NewEngine opens or creates a new AroraDB engine.
func NewEngine(dbDir string, maxFileSize int64) (*Engine, error) {
	if maxFileSize <= 0 {
		maxFileSize = DefaultMaxFileSize
	}

	// Create directory if not exists
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	eng := &Engine{
		dbDir:       dbDir,
		maxFileSize: maxFileSize,
		readFiles:   make(map[uint32]*os.File),
		keyDir:      make(map[string]KeyMetadata),
	}

	if err := eng.loadFilesAndBuildIndex(); err != nil {
		return nil, err
	}

	return eng, nil
}

// Get retrieves a value by key.
func (e *Engine) Get(key []byte) ([]byte, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if e.isClosed {
		return nil, os.ErrClosed
	}

	meta, ok := e.keyDir[string(key)]
	if !ok {
		return nil, nil // Key not found
	}

	var f *os.File
	if meta.FileID == e.activeFileID {
		f = e.activeFile
	} else {
		var exists bool
		f, exists = e.readFiles[meta.FileID]
		if !exists {
			return nil, fmt.Errorf("data file %d not found", meta.FileID)
		}
	}

	// Read entry
	buf := make([]byte, HeaderSize+len(key)+int(meta.ValueSize))
	_, err := f.ReadAt(buf, meta.ValueOffset-int64(HeaderSize)-int64(len(key)))
	if err != nil {
		return nil, fmt.Errorf("failed to read entry from file: %w", err)
	}

	// Verify CRC
	crc, _, _, _, _, err := DecodeHeader(buf[:HeaderSize])
	if err != nil {
		return nil, err
	}

	if !VerifyCRC(crc, buf[4:]) {
		return nil, ErrInvalidCRC
	}

	// Extract value
	value := buf[HeaderSize+len(key):]
	return value, nil
}

// Put writes a key-value pair to the active file.
func (e *Engine) Put(key []byte, value []byte) error {
	return e.writeEntry(key, value, TypeActive)
}

// Delete marks a key as deleted.
func (e *Engine) Delete(key []byte) error {
	e.mu.Lock()
	_, exists := e.keyDir[string(key)]
	e.mu.Unlock()

	if !exists {
		return nil // Key doesn't exist, nothing to delete
	}

	return e.writeEntry(key, []byte{}, TypeDelete)
}

// Scan returns all keys matching the prefix. Empty prefix returns all active keys.
func (e *Engine) Scan(prefix string) ([]KeyVal, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if e.isClosed {
		return nil, os.ErrClosed
	}

	var results []KeyVal
	for k, meta := range e.keyDir {
		if strings.HasPrefix(k, prefix) {
			// Read value
			var f *os.File
			if meta.FileID == e.activeFileID {
				f = e.activeFile
			} else {
				var exists bool
				f, exists = e.readFiles[meta.FileID]
				if !exists {
					continue
				}
			}

			buf := make([]byte, HeaderSize+len(k)+int(meta.ValueSize))
			_, err := f.ReadAt(buf, meta.ValueOffset-int64(HeaderSize)-int64(len(k)))
			if err != nil {
				continue
			}

			// Verify CRC
			crc, _, _, _, _, err := DecodeHeader(buf[:HeaderSize])
			if err != nil {
				continue
			}

			if !VerifyCRC(crc, buf[4:]) {
				continue
			}

			results = append(results, KeyVal{
				Key:   k,
				Value: string(buf[HeaderSize+len(k):]),
			})
		}
	}
	return results, nil
}

// Stats returns database metrics.
func (e *Engine) Stats() (int, int64, int) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	keyCount := len(e.keyDir)
	var dbSize int64
	for _, f := range e.readFiles {
		if info, err := f.Stat(); err == nil {
			dbSize += info.Size()
		}
	}
	if e.activeFile != nil {
		if info, err := e.activeFile.Stat(); err == nil {
			dbSize += info.Size()
		}
	}

	fileCount := len(e.readFiles)
	if e.activeFile != nil {
		fileCount++
	}

	return keyCount, dbSize, fileCount
}

// Close closes all open files.
func (e *Engine) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.isClosed {
		return nil
	}
	e.isClosed = true

	var errs []string
	if e.activeFile != nil {
		if err := e.activeFile.Sync(); err != nil {
			errs = append(errs, err.Error())
		}
		if err := e.activeFile.Close(); err != nil {
			errs = append(errs, err.Error())
		}
	}

	for id, f := range e.readFiles {
		if err := f.Close(); err != nil {
			errs = append(errs, fmt.Sprintf("file %d: %s", id, err.Error()))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing database: %s", strings.Join(errs, "; "))
	}
	return nil
}

// Internal writing helper
func (e *Engine) writeEntry(key []byte, value []byte, entryType uint8) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.isClosed {
		return os.ErrClosed
	}

	entry := NewEntry(key, value, entryType)
	encoded, err := Encode(entry)
	if err != nil {
		return err
	}

	// Check if active file exceeds size limit
	if e.writeOffset+int64(len(encoded)) > e.maxFileSize {
		if err := e.rotateActiveFile(); err != nil {
			return err
		}
	}

	offset := e.writeOffset
	_, err = e.activeFile.Write(encoded)
	if err != nil {
		return fmt.Errorf("failed to write data: %w", err)
	}
	e.writeOffset += int64(len(encoded))

	// Update KeyDir index
	if entryType == TypeDelete {
		delete(e.keyDir, string(key))
	} else {
		// Value offset is the start of value payload
		valOffset := offset + int64(HeaderSize) + int64(len(key))
		e.keyDir[string(key)] = KeyMetadata{
			FileID:      e.activeFileID,
			ValueSize:   uint32(len(value)),
			ValueOffset: valOffset,
			Timestamp:   entry.Timestamp,
		}
	}

	return nil
}

// rotateActiveFile closes the active file and opens a new one with an incremented ID.
func (e *Engine) rotateActiveFile() error {
	if e.activeFile != nil {
		if err := e.activeFile.Sync(); err != nil {
			return err
		}
		// Close writing descriptor and re-open as read-only descriptor
		if err := e.activeFile.Close(); err != nil {
			return err
		}

		path := filepath.Join(e.dbDir, fmt.Sprintf("%s%d", DataFilePrefix, e.activeFileID))
		roFile, err := os.Open(path)
		if err != nil {
			return err
		}
		e.readFiles[e.activeFileID] = roFile
	}

	e.activeFileID++
	path := filepath.Join(e.dbDir, fmt.Sprintf("%s%d", DataFilePrefix, e.activeFileID))
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to create new active file: %w", err)
	}

	e.activeFile = file
	e.writeOffset = 0
	return nil
}

// loadFilesAndBuildIndex discovers data files and builds the KeyDir memory index.
func (e *Engine) loadFilesAndBuildIndex() error {
	files, err := os.ReadDir(e.dbDir)
	if err != nil {
		return err
	}

	var fileIDs []int
	for _, f := range files {
		if !f.IsDir() && strings.HasPrefix(f.Name(), DataFilePrefix) {
			idStr := strings.TrimPrefix(f.Name(), DataFilePrefix)
			id, err := strconv.Atoi(idStr)
			if err != nil {
				continue
			}
			fileIDs = append(fileIDs, id)
		}
	}

	// Sort file IDs so we process them chronologically (oldest to newest)
	// We do basic bubble sort since it's simple and file count is small on startup
	for i := 0; i < len(fileIDs); i++ {
		for j := i + 1; j < len(fileIDs); j++ {
			if fileIDs[i] > fileIDs[j] {
				fileIDs[i], fileIDs[j] = fileIDs[j], fileIDs[i]
			}
		}
	}

	for _, id := range fileIDs {
		path := filepath.Join(e.dbDir, fmt.Sprintf("%s%d", DataFilePrefix, id))
		f, err := os.OpenFile(path, os.O_RDONLY, 0644)
		if err != nil {
			return fmt.Errorf("failed to open data file %d: %w", id, err)
		}

		// Read and index entries from file
		offset := int64(0)
		for {
			headerBuf := make([]byte, HeaderSize)
			_, err := f.ReadAt(headerBuf, offset)
			if err == io.EOF {
				break
			}
			if err != nil {
				return fmt.Errorf("failed to read header at offset %d: %w", offset, err)
			}

			crc, timestamp, entryType, keySize, valSize, err := DecodeHeader(headerBuf)
			if err != nil {
				break // Corrupted header or partial write at end of file
			}

			// Read key and value payload
			payloadLen := int64(keySize) + int64(valSize)
			payloadBuf := make([]byte, payloadLen)
			_, err = f.ReadAt(payloadBuf, offset+HeaderSize)
			if err != nil {
				break // Partial payload write
			}

			// Verify CRC
			combined := append(headerBuf[4:], payloadBuf...)
			if !VerifyCRC(crc, combined) {
				return fmt.Errorf("integrity error: database file %s is corrupted at offset %d", path, offset)
			}

			key := payloadBuf[:keySize]
			valOffset := offset + int64(HeaderSize) + int64(keySize)

			if entryType == TypeDelete {
				delete(e.keyDir, string(key))
			} else {
				e.keyDir[string(key)] = KeyMetadata{
					FileID:      uint32(id),
					ValueSize:   valSize,
					ValueOffset: valOffset,
					Timestamp:   timestamp,
				}
			}

			offset += int64(HeaderSize) + payloadLen
		}

		// Keep open for reads
		e.readFiles[uint32(id)] = f
	}

	// Initialize active file
	var activeID uint32
	if len(fileIDs) > 0 {
		// Set the last file as active (open it in RW mode, replacing the read-only handle)
		activeID = uint32(fileIDs[len(fileIDs)-1])
		delete(e.readFiles, activeID) // Remove read-only descriptor
	}

	path := filepath.Join(e.dbDir, fmt.Sprintf("%s%d", DataFilePrefix, activeID))
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open active file: %w", err)
	}

	info, err := file.Stat()
	if err != nil {
		return err
	}

	e.activeFile = file
	e.activeFileID = activeID
	e.writeOffset = info.Size()

	return nil
}
