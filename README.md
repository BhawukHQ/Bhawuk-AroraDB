# AroraDB 🚀

> **AroraDB** is a lightweight, custom-branded, high-performance Key-Value and Document database written in Go, featuring a built-in, premium dark-themed React admin console dashboard.

Designed for developer workflows, scripting automation, and lightweight persistent application storage, AroraDB compiles to a single executable binary containing both the database server and its management UI.

---

## Key Features

1. **Storage Engine (Bitcask Design)**: Sequential write-ahead data logging (`aroradb.data.<id>`) coupled with a fast in-memory index (`KeyDir`). Provides high write throughput and $O(1)$ single-seek reads.
2. **Abstract Architecture**: Engineered with clean design patterns using a decoupled Go `StorageEngine` interface (Dependency Inversion Principle), enabling future storage engine swaps.
3. **Data Integrity**: Built-in record headers containing IEEE CRC32 checksums validating data blocks on every start and read.
4. **Document Store**: Built-in schema-less JSON document layer organizing records into namespaces/collections, supporting field-nested query filters (e.g. `profile.role = "admin"`).
5. **Log Compaction**: Self-contained log merging logic that cleans obsolete states, tombstone markers, and optimizes index ranges.
6. **Embedded Admin Dashboard**: Glassmorphic, modern React + TS single-page application telemetry dashboard serving real-time system charts (Recharts), database browsers, API documentations, and an interactive query playground.

---

## Project Structure

```
Bhawuk-AroraDB/
├── cmd/
│   └── aroradb/
│       └── main.go           # CLI application entrypoint
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration loader
│   ├── engine/
│   │   ├── engine.go         # StorageEngine abstract interface
│   │   ├── entry.go          # Binary serialization & CRC checksums
│   │   ├── bitcask.go        # Append-only sequential storage engine
│   │   └── compact.go        # Database log compaction / merge logic
│   ├── document/
│   │   └── collection.go     # Collection-based document indexing & queries
│   ├── api/
│   │   ├── server.go         # HTTP Server routers & middleware
│   │   └── web/              # Compiled React build static files (embedded)
│   └── metrics/
│       └── metrics.go        # Memory, ops/sec, and disk usage tracker
├── dashboard/                # React TypeScript Web Console Source Code
├── scripts/
│   └── demo.ps1              # Automation endpoint testing script
├── Dockerfile                # Multi-stage production container setup
└── docker-compose.yml        # Orchestration configuration
```

---

## Quickstart

### 1. Compile and Run
Ensure Go 1.22+ is installed, then build the binary:
```bash
# Compile
go build -o aroradb.exe ./cmd/aroradb

# Start database on default port 8080
./aroradb.exe -port 8080 -dir ./data
```
Open your browser and navigate to `http://localhost:8080/` to access the admin telemetry console.

### 2. Run Automation Demo
We have provided a Powershell testing script in `scripts/demo.ps1` that spins up the compiled database, tests KV reads/writes, inserts documents, processes nested JSON queries, verifies system metrics, and stops the process:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo.ps1
```

---

## HTTP REST API Endpoints

Secure your API server by passing an authorization token on startup (via flag `-token my-secret` or environment variable `ARORADB_TOKEN`). When enabled, all request calls must include the header `X-Arora-Token: <token>`.

### Key-Value Store
* **`GET /api/kv`**: List all database keys. Returns `[{"Key":"welcome","Value":"hello"}]`.
* **`GET /api/kv/{key}`**: Retrieve value. Returns `{"key":"key1","value":"val1"}`.
* **`POST /api/kv/{key}`**: Save value. Body is raw bytes or text payload.
* **`DELETE /api/kv/{key}`**: Delete key.

### Document Collections
* **`GET /api/collections`**: List all unique collections.
* **`GET /api/documents/{collection}`**: List all documents in a collection.
* **`GET /api/documents/{collection}/{id}`**: Retrieve document.
* **`POST /api/documents/{collection}`**: Insert/Update document. Body must be valid JSON. (Provide `?id=my-id` query param or write `_id` field inside JSON, otherwise an ID is auto-generated).
* **`DELETE /api/documents/{collection}/{id}`**: Delete document.
* **`POST /api/documents/{collection}/query`**: Search documents. Body is a JSON filter (supports nested paths, e.g., `{"profile.role": "admin"}`).

### Maintenance & Telemetry
* **`GET /api/metrics`**: Returns database file metrics, operations/sec throughput rates, memory allocs, and keys count.
* **`POST /api/admin/compact`**: Manually trigger log merging and directory cleaning.

---

## Self-Hosting

### Docker Run
Start the database server instantly with persistent storage:
```bash
docker build -t aroradb:latest .
docker run -d -p 8080:8080 -v aroradb_data:/data -e ARORADB_TOKEN=my-secure-token aroradb:latest
```

### Docker Compose
Modify properties inside `docker-compose.yml` and run:
```bash
docker-compose up -d
```

---

## Learning Roadmap: DoraDB Design Plan

This repository is built following a structured 10-phase database internals engineering roadmap:

### Phase 0 — Foundations (2 Weeks)
* **Topics**: Binary file formats, Page layout (4KB/8KB pages), Disk I/O, Serialization, Checksums, Cache locality.
* **Build**: File Manager, Disk Manager, Page Manager, Binary Encoder/Decoder, CRC Validation.

### Phase 1 — Storage Engine (3 Weeks)
* **Topics**: WAL, Crash Recovery, MemTables, SSTables, Immutable storage, Append-only design.
* **Build**: WAL, MemTable, SSTable, Flush Mechanism, Recovery on Startup.

### Phase 2 — LSM Tree (3 Weeks)
* **Topics**: LSM Trees, Compaction, Bloom Filters, Skip Lists, Leveled vs Tiered Compaction.
* **Build**: Multi-Level LSM Tree, Bloom Filters, Background Compaction, Manifest File.

### Phase 3 — Transactions & Concurrency (4 Weeks)
* **Topics**: ACID, MVCC, Snapshot Isolation, Lock Manager, Deadlock Detection.
* **Build**: MVCC, Version Chains, Lock Manager, Transaction Manager, Deadlock Detection.

### Phase 4 — Indexing (2 Weeks)
* **Topics**: B+ Trees, Hash Indexes, Secondary Indexes, Covering Indexes.
* **Build**: B+ Tree, Hash Index, Composite Index, Secondary Indexes.

### Phase 5 — Query Engine (5 Weeks)
* **Topics**: SQL Parsing, AST, Query Planning, Query Optimization, Execution Engine.
* **Build**: Lexer -> Parser -> AST -> Logical Plan -> Optimizer -> Physical Plan -> Execution Engine.

### Phase 6 — Query Wire Protocol (2 Weeks)
* **Topics**: TCP, Binary protocols, Connection Pooling, Client SDK.
* **Build**: TCP Server, Wire Protocol, Client SDK.

### Phase 7 — Replication (4 Weeks)
* **Topics**: Raft Consensus, Log Replication, Leader Election, Failover.
* **Build**: Leader Election, WAL Replication, Heartbeats, Failover.

### Phase 8 — Distributed Database (5 Weeks)
* **Topics**: Consistent Hashing, Sharding, Two-Phase Commit.
* **Build**: Multi-node cluster, Sharding, Distributed Query Routing.

### Phase 9 — Performance Engineering (Ongoing)
* **Topics**: SIMD, Cache locality, Zero-copy, Vectorized execution.
* **Build**: Vectorized Execution, Async I/O, Compression.

### Phase 10 — Observability
* **Topics**: Metrics, Prometheus Exporter, Slow query logs, Dashboard.
* **Build**: Structured Logging, Exporter, Dashboard.
