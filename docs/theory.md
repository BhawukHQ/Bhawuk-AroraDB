# AroraDB: Theoretical & Internals Guide

This document dives deep into the theoretical architecture and mathematical principles underlying AroraDB. It provides insight into time complexities, the physics of our storage engine, and how our multi-model systems interact under the hood.

---

## 1. Storage Physics: The Bitcask KV Engine

At its lowest layer, AroraDB is powered by a custom implementation of the Bitcask model.

### 1.1 Append-Only Log Architecture
Unlike traditional B-Tree databases (like PostgreSQL) that overwrite pages in place (requiring complex locking and buffer pools), AroraDB treats storage as an append-only transaction log. Every `PUT` or `DELETE` is appended to the tail of an active `data.db` file.

**Complexity**: 
Disk write operations are completely sequential, achieving `O(1)` time complexity for mutations. Because disk seeks are avoided entirely, write throughput is strictly limited by the IOPS of the underlying AWS EBS gp3 NVMe drives.

### 1.2 KeyDir Hash Table
To facilitate rapid lookups, the engine maintains an in-memory hash table called `KeyDir`.
```go
KeyDir[Key] = { FileID, ValueSize, ValuePosition, Timestamp }
```
When `GET(Key)` is executed:
1. Lookup the offset in the `KeyDir` (`O(1)` RAM lookup).
2. Execute a single sequential disk read at `ValuePosition` (`O(1)` Disk I/O).

**Compaction:** Background routines merge immutable data files, retaining only the latest Timestamp for any given key, preventing unbounded disk growth.

---

## 2. Theoretical Indexing Overlays

Because the underlying engine is schema-less bytes, AroraDB layers three distinct logical indexes to support SQL, JSON, and Vectors.

### 2.1 Relational SQL: The B+ Tree Index
To support `SELECT * FROM users WHERE age > 20`, a standard hash table is insufficient (it cannot do range scans). AroraDB maintains an in-memory B+ Tree.

- **Structure**: A self-balancing tree where data pointers only exist in the leaf nodes, which are linked together as a doubly-linked list.
- **Search Complexity**: `O(log b N)` where `b` is the branching factor.
- **Range Query Complexity**: `O(log b N + K)` where `K` is the number of elements in the range.

### 2.2 Document Store: The Inverted Index
For full-text search across JSON fields, AroraDB uses an Inverted Index.
- **Tokenization**: Text is stripped of stop-words and reduced to stems.
- **Mapping**: Each token points to a posting list of Document IDs.
  `"cloud" -> [doc1, doc7, doc42]`
- **Intersection**: Queries like `"cloud database"` perform a fast Set Intersection over the posting lists.

### 2.3 Vector Database: HNSW Graph
To search AI embeddings (e.g., 1536-dimensional OpenAI vectors), exhaustive `O(N)` scans are too slow. AroraDB implements Hierarchical Navigable Small World (HNSW) graphs.

**Cosine Similarity Formula**:
\[ \text{similarity} = \frac{A \cdot B}{||A|| ||B||} = \frac{\sum_{i=1}^n A_i B_i}{\sqrt{\sum_{i=1}^n A_i^2} \sqrt{\sum_{i=1}^n B_i^2}} \]

**Graph Traversal**: HNSW builds a multi-layered skip-list graph. The search drops from the sparse top layer down to the dense bottom layer, greedily jumping to closer nodes.
- **Search Complexity**: `O(log N)` for highly dimensional data, dramatically outperforming flat FlatL2 or IVF variants.

---

## 3. Distributed Consensus: Raft & WAL

### 3.1 Write-Ahead Logging (WAL)
To survive Kubernetes Pod crashes without losing data, AroraDB writes to a binary WAL before mutating the `KeyDir` or `B+ Tree`.
1. Request arrives.
2. Binary intent is formatted: `[Type][Timestamp][Key][Value]`.
3. Intent is `fsync`'d to disk.
4. Memory index is updated.

### 3.2 Raft Leader Election & Split-Brain
AroraDB clusters utilize the Raft consensus algorithm over gRPC.
- **Election Math**: To become Leader, a node must receive `(N/2) + 1` votes. In a 3-node StatefulSet, a quorum of `2` is required.
- **Split-Brain Immunity**: If a network partition isolates Node A from Node B and C, Node A cannot achieve quorum (`1 < 2`) and steps down to Follower. Nodes B and C elect a leader and continue processing writes, ensuring strict linearizability and CAP Theorem Consistency over Availability (CP).

---

## 4. Horizontal Sharding: Consistent Hashing
To scale beyond the disk capacity of a single Raft cluster, AroraDB introduces horizontal sharding.

Instead of a modulo hash (`Hash(key) % N`) which catastrophically rebalances the entire dataset when nodes are added or removed, AroraDB maps both Nodes and Keys onto a 360-degree Consistent Hashing ring (`0` to `2^32-1`).

**Lookup**: 
`Target Node = First Node on the ring clockwise from Hash(Key)`.
When a new node is added, it only assumes responsibility for the keys immediately preceding it on the ring, minimizing data migration overhead to `O(K/N)` instead of `O(K)`.
