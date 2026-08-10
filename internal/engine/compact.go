package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Compact merges files by removing stale keys and deleted values.
func (e *Engine) Compact() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.isClosed {
		return os.ErrClosed
	}

	// 1. Gather all active keys and their values
	type kvTemp struct {
		key []byte
		val []byte
	}
	var activeData []kvTemp

	for k, meta := range e.keyDir {
		// Read value from file
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

		activeData = append(activeData, kvTemp{
			key: []byte(k),
			val: buf[HeaderSize+len(k):],
		})
	}

	// 2. Close active file and all read files
	if e.activeFile != nil {
		_ = e.activeFile.Close()
	}
	for _, f := range e.readFiles {
		_ = f.Close()
	}

	// 3. Write active data to a new temporary file in dbDir
	tempFileName := "aroradb.data.compact"
	tempPath := filepath.Join(e.dbDir, tempFileName)
	tempFile, err := os.OpenFile(tempPath, os.O_CREATE|os.O_RDWR|os.O_TRUNC, 0644)
	if err != nil {
		// Try to reopen DB so it remains usable
		_ = e.reloadDB()
		return fmt.Errorf("compaction failed to create temp file: %w", err)
	}

	writeOffset := int64(0)
	newKeyDir := make(map[string]KeyMetadata)

	for _, data := range activeData {
		entry := NewEntry(data.key, data.val, TypeActive)
		encoded, err := Encode(entry)
		if err != nil {
			_ = tempFile.Close()
			_ = os.Remove(tempPath)
			_ = e.reloadDB()
			return err
		}

		_, err = tempFile.Write(encoded)
		if err != nil {
			_ = tempFile.Close()
			_ = os.Remove(tempPath)
			_ = e.reloadDB()
			return fmt.Errorf("compaction write failed: %w", err)
		}

		valOffset := writeOffset + int64(HeaderSize) + int64(len(data.key))
		newKeyDir[string(data.key)] = KeyMetadata{
			FileID:      0, // Compacted file will become file 0
			ValueSize:   uint32(len(data.val)),
			ValueOffset: valOffset,
			Timestamp:   entry.Timestamp,
		}

		writeOffset += int64(len(encoded))
	}

	_ = tempFile.Close()

	// 4. Remove all old data files in the database directory
	files, err := os.ReadDir(e.dbDir)
	if err == nil {
		for _, f := range files {
			if !f.IsDir() && strings.HasPrefix(f.Name(), DataFilePrefix) {
				_ = os.Remove(filepath.Join(e.dbDir, f.Name()))
			}
		}
	}

	// 5. Rename compacted file to aroradb.data.0
	finalPath := filepath.Join(e.dbDir, fmt.Sprintf("%s0", DataFilePrefix))
	if err := os.Rename(tempPath, finalPath); err != nil {
		return fmt.Errorf("compaction failed during file rename: %w", err)
	}

	// 6. Reset engine state
	e.readFiles = make(map[uint32]*os.File)
	e.keyDir = newKeyDir

	activeFile, err := os.OpenFile(finalPath, os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("compaction failed to reopen new active file: %w", err)
	}

	e.activeFile = activeFile
	e.activeFileID = 0
	e.writeOffset = writeOffset

	return nil
}

// reloadDB is a helper to reopen the DB if an error occurs mid-compaction.
func (e *Engine) reloadDB() error {
	e.readFiles = make(map[uint32]*os.File)
	e.keyDir = make(map[string]KeyMetadata)
	return e.loadFilesAndBuildIndex()
}

// StatsInfo returns details on space saving potential
func (e *Engine) CompactionRatio() float64 {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var totalSize int64
	var activeSize int64

	for k, meta := range e.keyDir {
		activeSize += int64(HeaderSize) + int64(len(k)) + int64(meta.ValueSize)
	}

	for _, f := range e.readFiles {
		if stat, err := f.Stat(); err == nil {
			totalSize += stat.Size()
		}
	}
	if e.activeFile != nil {
		if stat, err := e.activeFile.Stat(); err == nil {
			totalSize += stat.Size()
		}
	}

	if totalSize == 0 {
		return 0
	}
	return float64(activeSize) / float64(totalSize)
}
