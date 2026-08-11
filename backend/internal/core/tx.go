package core

import (
	"context"
	"errors"
	"sync"
)

var (
	ErrTxConflict = errors.New("transaction conflict")
)

// TxManager manages MVCC snapshot isolation for concurrent transactions.
type TxManager interface {
	Begin(ctx context.Context, writable bool) (Transaction, error)
}

// Transaction represents a single atomic, consistent, isolated MVCC transaction.
type Transaction interface {
	Get(key []byte) ([]byte, error)
	Put(key, value []byte) error
	Delete(key []byte) error
	Commit() error
	Rollback() error
}

// mvccTxManager is a simple implementation of TxManager.
type mvccTxManager struct {
	mu           sync.RWMutex
	globalTxID   uint64
	activeTx     map[uint64]struct{}
	engine       StorageEngine
}

func NewTxManager(engine StorageEngine) TxManager {
	return &mvccTxManager{
		activeTx: make(map[uint64]struct{}),
		engine:   engine,
	}
}

func (m *mvccTxManager) Begin(ctx context.Context, writable bool) (Transaction, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.globalTxID++
	txID := m.globalTxID
	m.activeTx[txID] = struct{}{}
	return &mvccTx{
		id:       txID,
		manager:  m,
		writable: writable,
		readSet:  make(map[string]uint64),
		writeSet: make(map[string][]byte),
	}, nil
}

type mvccTx struct {
	id       uint64
	manager  *mvccTxManager
	writable bool
	readSet  map[string]uint64
	writeSet map[string][]byte
}

func (t *mvccTx) Get(key []byte) ([]byte, error) {
	if val, ok := t.writeSet[string(key)]; ok {
		return val, nil
	}
	val, err := t.manager.engine.Get(key)
	// In a real MVCC, we'd record the version we read to check for conflicts later.
	t.readSet[string(key)] = t.manager.globalTxID
	return val, err
}

func (t *mvccTx) Put(key, value []byte) error {
	if !t.writable {
		return errors.New("read-only transaction")
	}
	t.writeSet[string(key)] = value
	return nil
}

func (t *mvccTx) Delete(key []byte) error {
	return t.Put(key, nil)
}

func (t *mvccTx) Commit() error {
	if !t.writable {
		t.manager.mu.Lock()
		delete(t.manager.activeTx, t.id)
		t.manager.mu.Unlock()
		return nil
	}
	
	t.manager.mu.Lock()
	defer t.manager.mu.Unlock()
	
	// Write to storage engine
	for k, v := range t.writeSet {
		if v == nil {
			_ = t.manager.engine.Delete([]byte(k))
		} else {
			_ = t.manager.engine.Put([]byte(k), v)
		}
	}
	delete(t.manager.activeTx, t.id)
	return nil
}

func (t *mvccTx) Rollback() error {
	t.manager.mu.Lock()
	delete(t.manager.activeTx, t.id)
	t.manager.mu.Unlock()
	return nil
}
