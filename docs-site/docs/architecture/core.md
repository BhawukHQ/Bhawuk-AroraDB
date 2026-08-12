# AroraDB Architecture Knowledge Base

## Overview
AroraDB is an enterprise-grade, multi-model database SaaS platform built for high performance, cloud-native scalability, and developer experience. It natively supports Key-Value, Relational SQL, JSON Documents, and Vector Embeddings (HNSW) within a unified query engine.

## Core Architecture

The architecture is divided into three major pillars, enforcing strict SOLID and Domain-Driven Design (DDD) principles:

### 1. High-Performance Go Backend (`/backend`)
The backend is written in Go 1.26+ and heavily leverages concurrency, interface-driven design, and strict tenant isolation.
- **`internal/engine/`**: The core storage engines.
  - **KV Engine (Bitcask)**: The foundational log-structured merge-tree for fast disk writes and fast reads.
  - **B+ Tree Indexing**: In-memory sorted tree indexing mapping row values to the KV store for fast Relational SQL range scans.
  - **Inverted Indexing**: Tokenized inverted index mapping text terms to JSON Document IDs for full-text search.
  - **Vector Engine (HNSW)**: Graph-based Hierarchical Navigable Small World index for fast approximate nearest-neighbor LLM queries.
- **`internal/core/wal.go`**: The Disk-Backed Write-Ahead Log. Guarantees true ACID durability by `fsync`ing all operations to disk before updating the memory indexes.
- **`internal/modules/usermanager/`**: Domain models handling `User`, `TenantQuota`, `UsageStats`, and granular `APIKey` scoping.
- **`internal/api/middleware/tenant.go`**: A highly concurrent Token-Bucket rate limiter enforcing RPS and strict disk storage quotas per tenant.

### 2. Next.js SaaS Frontend (`/frontend`)
The frontend is a modern Next.js App Router application written in TypeScript, featuring a high-density, dark-themed UI (Stitch Design System).
- **Admin Dashboards**: Cluster topology visualization, tenant storage management, and global audit log monitoring.
- **User Workspaces**: Multi-Model Studio console for SQL, Document, and Vector querying.
- **API Key Manager**: Granular scope generation and IP whitelisting for programmatic access.
- **Client-Side Data Fetching**: Utilizes `lib/api.ts` to seamlessly communicate with the Go backend via stateless, token-authenticated requests.

### 3. GitOps Cloud Deployment (`/terraform` & `/helm`)
The deployment architecture uses GitOps principles for AWS Kubernetes.
- **Terraform (`/terraform`)**: Provisions the AWS VPC, EKS Cluster (m6i instances), IAM IRSA roles, and EBS CSI drivers for persistent storage.
- **Helm & ArgoCD (`/helm`)**: Deploys the Go backend as a 3-Node StatefulSet (Leader-Replica architecture) mapping `/data/db` to gp3 NVMe volumes. The Next.js frontend is deployed as a Stateless Deployment.
- **AWS ALB Ingress**: Routes `api.aroradb.bhawukarora.app` and `app.aroradb.bhawukarora.app` traffic securely into the cluster while offloading authentication entirely to **AWS Cognito**. See [Authentication Architecture](authentication.md) for details on the stateless OIDC flow.

---

## Technical Design Decisions

1. **Why Bitcask + WAL?**
   Bitcask provides extreme write-throughput by appending to active data files without blocking. To ensure zero data loss during crashes, the binary WAL strictly `fsync`s the transaction intent before the memory hash tables or B+ Trees are mutated.

2. **Why Pluggable Indexing?**
   Instead of forcing all data into one paradigm, the core engine treats data as byte slices. The pluggable engines (B+ Tree, Inverted, Vector) are overlaid on top of the KV store, allowing AroraDB to behave as a Relational, Document, or AI database seamlessly.

3. **Why Token-Bucket Rate Limiting?**
   A multi-tenant SaaS requires strict noisy-neighbor protection. The Token-Bucket algorithm allows short bursts of traffic while smoothly throttling sustained abusive queries, executing completely lock-free in Go routines.

