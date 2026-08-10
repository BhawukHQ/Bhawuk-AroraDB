package metrics

import (
	"runtime"
	"sync/atomic"
	"time"
)

type Tracker struct {
	reads       uint64
	writes      uint64
	deletes     uint64
	queries     uint64
	
	// Calculated rates
	readRate    uint64
	writeRate   uint64
	
	// Temporary counters for rate calculation
	tempReads   uint64
	tempWrites  uint64
}

var globalTracker *Tracker

func InitTracker() *Tracker {
	globalTracker = &Tracker{}
	go globalTracker.startRateCalculator()
	return globalTracker
}

func GetTracker() *Tracker {
	if globalTracker == nil {
		InitTracker()
	}
	return globalTracker
}

func (t *Tracker) IncReads() {
	atomic.AddUint64(&t.reads, 1)
	atomic.AddUint64(&t.tempReads, 1)
}

func (t *Tracker) IncWrites() {
	atomic.AddUint64(&t.writes, 1)
	atomic.AddUint64(&t.tempWrites, 1)
}

func (t *Tracker) IncDeletes() {
	atomic.AddUint64(&t.deletes, 1)
}

func (t *Tracker) IncQueries() {
	atomic.AddUint64(&t.queries, 1)
}

func (t *Tracker) startRateCalculator() {
	ticker := time.NewTicker(1 * time.Second)
	for range ticker.C {
		reads := atomic.SwapUint64(&t.tempReads, 0)
		writes := atomic.SwapUint64(&t.tempWrites, 0)
		atomic.StoreUint64(&t.readRate, reads)
		atomic.StoreUint64(&t.writeRate, writes)
	}
}

type SysStats struct {
	TotalReads     uint64 `json:"total_reads"`
	TotalWrites    uint64 `json:"total_writes"`
	TotalDeletes   uint64 `json:"total_deletes"`
	TotalQueries   uint64 `json:"total_queries"`
	ReadRate       uint64 `json:"read_rate"`
	WriteRate      uint64 `json:"write_rate"`
	AllocatedMemMB float64 `json:"allocated_mem_mb"`
	NumGoroutines  int    `json:"num_goroutines"`
}

func (t *Tracker) GetSystemStats() SysStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return SysStats{
		TotalReads:     atomic.LoadUint64(&t.reads),
		TotalWrites:    atomic.LoadUint64(&t.writes),
		TotalDeletes:   atomic.LoadUint64(&t.deletes),
		TotalQueries:   atomic.LoadUint64(&t.queries),
		ReadRate:       atomic.LoadUint64(&t.readRate),
		WriteRate:      atomic.LoadUint64(&t.writeRate),
		AllocatedMemMB: float64(m.Alloc) / 1024 / 1024,
		NumGoroutines:  runtime.NumGoroutine(),
	}
}
