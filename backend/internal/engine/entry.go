package engine

import (
	"encoding/binary"
	"errors"
	"hash/crc32"
	"time"
)

const (
	// HeaderSize is: CRC (4) + Timestamp (8) + Type (1) + KeySize (4) + ValueSize (4) = 21 bytes
	HeaderSize = 21

	TypeActive uint8 = 0
	TypeDelete uint8 = 1
)

var ErrInvalidCRC = errors.New("data corruption detected: CRC checksum mismatch")
var ErrHeaderTooShort = errors.New("header bytes too short")

// Entry represents a record written to the append-only data files.
type Entry struct {
	CRC       uint32
	Timestamp uint64
	Type      uint8
	Key       []byte
	Value     []byte
}

// NewEntry creates a new record entry.
func NewEntry(key []byte, value []byte, entryType uint8) *Entry {
	return &Entry{
		Timestamp: uint64(time.Now().UnixNano()),
		Type:      entryType,
		Key:       key,
		Value:     value,
	}
}

// Encode serializes an Entry into a byte slice.
// Layout: [CRC (4 bytes)][Timestamp (8 bytes)][Type (1 byte)][KeySize (4 bytes)][ValueSize (4 bytes)][Key][Value]
func Encode(e *Entry) ([]byte, error) {
	keyLen := len(e.Key)
	valLen := len(e.Value)
	buf := make([]byte, HeaderSize+keyLen+valLen)

	// Write fields (excluding CRC first)
	binary.BigEndian.PutUint64(buf[4:12], e.SessionTimestamp())
	buf[12] = e.Type
	binary.BigEndian.PutUint32(buf[13:17], uint32(keyLen))
	binary.BigEndian.PutUint32(buf[17:21], uint32(valLen))

	copy(buf[HeaderSize:HeaderSize+keyLen], e.Key)
	copy(buf[HeaderSize+keyLen:], e.Value)

	// Calculate CRC from Timestamp (offset 4) to the end of the entry
	crc := crc32.ChecksumIEEE(buf[4:])
	binary.BigEndian.PutUint32(buf[0:4], crc)
	e.CRC = crc

	return buf, nil
}

// DecodeHeader extracts the header info from raw bytes.
func DecodeHeader(buf []byte) (crc uint32, timestamp uint64, entryType uint8, keySize uint32, valSize uint32, err error) {
	if len(buf) < HeaderSize {
		return 0, 0, 0, 0, 0, ErrHeaderTooShort
	}

	crc = binary.BigEndian.Uint32(buf[0:4])
	timestamp = binary.BigEndian.Uint64(buf[4:12])
	entryType = buf[12]
	keySize = binary.BigEndian.Uint32(buf[13:17])
	valSize = binary.BigEndian.Uint32(buf[17:21])

	return crc, timestamp, entryType, keySize, valSize, nil
}

// SessionTimestamp returns the timestamp, using current time if unset.
func (e *Entry) SessionTimestamp() uint64 {
	if e.Timestamp == 0 {
		return uint64(time.Now().UnixNano())
	}
	return e.Timestamp
}

// VerifyCRC checks if the CRC in the entry matches the data.
func VerifyCRC(expectedCRC uint32, headerAndPayload []byte) bool {
	// Calculate CRC of everything after the CRC field (which is the first 4 bytes)
	calculated := crc32.ChecksumIEEE(headerAndPayload)
	return calculated == expectedCRC
}
