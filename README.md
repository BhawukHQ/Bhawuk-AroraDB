# DoraDB

> Building a high-performance distributed database from scratch.
>
> **Goal:** Learn database internals, storage engines, distributed systems, networking, concurrency, and performance engineering by implementing every major component ourselves.

---

# Phase 0 — Foundations (2 Weeks)

## Learn

- Binary file formats
- Page layout (4KB/8KB pages)
- Disk I/O
- Serialization & Deserialization
- Checksums (CRC32)
- Memory alignment
- Cache locality

### Read

- Designing Data-Intensive Applications (Ch. 1–3)
- SQLite Architecture Overview
- Go Performance Guide

## Build

- File Manager
- Disk Manager
- Page Manager
- Binary Encoder/Decoder
- CRC Validation
- Benchmark Suite

**Deliverable**

```
storage/
├── disk.go
├── page.go
├── file.go
└── benchmark.go
```

---

# Phase 1 — Storage Engine (3 Weeks)

## Learn

- Write-Ahead Logging (WAL)
- Crash Recovery
- MemTables
- SSTables
- Immutable storage
- Append-only design

### Read

- Bitcask Paper
- DDIA Chapter 3

## Build

- WAL
- MemTable
- SSTable
- Flush Mechanism
- Recovery on Startup

**Deliverable**

```
storage/
├── wal/
├── memtable/
├── sstable/
└── recovery/
```

---

# Phase 2 — LSM Tree (3 Weeks)

## Learn

- LSM Trees
- Compaction
- Bloom Filters
- Skip Lists
- Leveled vs Tiered Compaction
- RocksDB Architecture

### Read

- RocksDB Wiki
- LevelDB Source Code

## Build

- Multi-Level LSM Tree
- Bloom Filters
- Background Compaction
- Manifest File
- Snapshot Support
- Tombstones

**Deliverable**

```
lsm/
├── memtable.go
├── sstable.go
├── bloom.go
├── compaction.go
└── manifest.go
```

---

# Phase 3 — Transactions & Concurrency (4 Weeks)

## Learn

- ACID
- MVCC
- Snapshot Isolation
- Serializable Isolation
- Lock Manager
- Deadlocks
- Optimistic vs Pessimistic Locking

### Read

- PostgreSQL MVCC
- DDIA Transactions

## Build

- MVCC
- Version Chains
- Lock Manager
- Transaction Manager
- Deadlock Detection
- Snapshot Reads

**Deliverable**

```
txn/
├── mvcc.go
├── lock_manager.go
├── transaction.go
└── snapshot.go
```

---

# Phase 4 — Indexing (2 Weeks)

## Learn

- B+ Trees
- Hash Indexes
- Secondary Indexes
- Covering Indexes

### Build

- B+ Tree
- Hash Index
- Composite Index
- Secondary Indexes

---

# Phase 5 — Query Engine (5 Weeks)

## Learn

- SQL Parsing
- AST
- Query Planning
- Query Optimization
- Execution Engine

### Read

- SQLite Parser
- PostgreSQL Planner

## Build

```
SQL
↓

Lexer
↓

Parser
↓

AST
↓

Logical Plan
↓

Optimizer
↓

Physical Plan
↓

Execution Engine
```

Support

- CREATE TABLE
- INSERT
- UPDATE
- DELETE
- SELECT
- WHERE
- ORDER BY
- GROUP BY
- LIMIT

---

# Phase 6 — Networking (2 Weeks)

## Learn

- TCP
- Binary Protocols
- Connection Pooling
- Request Multiplexing

### Build

- TCP Server
- Binary Wire Protocol
- Client SDK
- Connection Pool
- Authentication

Example

```
Client

↓

TCP

↓

Protocol

↓

Database
```

---

# Phase 7 — Replication (4 Weeks)

## Learn

- Raft
- Consensus
- Log Replication
- Leader Election
- Quorum Reads
- Failover

### Read

- Raft Paper
- etcd/raft Source

## Build

- Leader Election
- Followers
- WAL Replication
- Heartbeats
- Snapshot Replication
- Automatic Failover

---

# Phase 8 — Distributed Database (5 Weeks)

## Learn

- Consistent Hashing
- Sharding
- Cluster Membership
- Rebalancing
- Distributed Transactions
- Two-Phase Commit

## Build

- Multi-node Cluster
- Sharding
- Cluster Metadata
- Data Migration
- Rebalancing
- Distributed Query Routing

---

# Phase 9 — Performance Engineering (Ongoing)

## Learn

- SIMD
- Cache Locality
- Branch Prediction
- Memory Pools
- Arena Allocation
- Zero-copy
- mmap
- io_uring
- Lock-free Data Structures

## Build

- Parallel Query Execution
- Compression
- Vectorized Execution
- Adaptive Caching
- Async I/O

Benchmark Against

- SQLite
- RocksDB
- BadgerDB
- Pebble

---

# Phase 10 — Observability

## Build

- Metrics
- Prometheus Exporter
- pprof
- Tracing
- Structured Logging
- Slow Query Log
- Dashboard

---

# Long-Term Goals

- Distributed SQL
- Cost-Based Query Optimizer
- Columnar Storage Engine
- Vectorized Execution Engine
- Time-Series Storage
- Full-Text Search
- Vector Indexes (HNSW)
- Cloud Native Deployment
- Kubernetes Operator
- HTTP API
- CLI
- Web Dashboard

---

# Repository Structure

```
doradb/

cmd/
internal/
    storage/
    wal/
    page/
    buffer/
    lsm/
    txn/
    index/
    parser/
    planner/
    optimizer/
    executor/
    network/
    raft/
    cluster/
    metrics/

benchmarks/
docs/
examples/
scripts/
tests/
```

---

# Design Documents

Every major feature must have a design document before implementation.

```
docs/

0001-storage-engine.md
0002-page-format.md
0003-wal.md
0004-lsm-tree.md
0005-compaction.md
0006-bloom-filters.md
0007-mvcc.md
0008-indexes.md
0009-query-engine.md
0010-network-protocol.md
0011-raft.md
0012-sharding.md
0013-performance.md
architecture.md
```

---

# Core Principles

- Build from first principles.
- Prioritize correctness before optimization.
- Benchmark every major change.
- Keep components modular and independently testable.
- Write design docs before writing code.
- Measure performance; don't assume it.
- Learn from production systems, but implement independently.

---

# Technologies

- **Language:** Go
- **Protocol:** Custom Binary Protocol
- **Storage Engine:** LSM Tree
- **Consensus:** Raft
- **Indexes:** B+ Tree + Bloom Filters
- **Transactions:** MVCC
- **Testing:** Go Test + Benchmarks
- **Observability:** Prometheus + pprof

---

# Inspiration

- PostgreSQL
- SQLite
- RocksDB
- Pebble
- CockroachDB
- TiDB
- FoundationDB
- ClickHouse
- DuckDB
- etcd
- BadgerDB
