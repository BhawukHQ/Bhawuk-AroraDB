# AroraDB

AroraDB is an enterprise-grade, multi-model database SaaS platform supporting Key-Value, JSON Documents, Relational SQL, and Vector Embeddings.

## Architecture

The project has been refactored into a modern, decoupled Cloud Native architecture:

*   **`backend/`**: Contains the Go core engine.
    *   Implements clean Domain-Driven Design (DDD).
    *   Features a `StorageEngine` interface, `TxManager` (MVCC & WAL), and plug-and-play `Module` registry.
    *   Provides dual-portal Auth Middleware (JWT for UI sessions, API Keys for programmatic access).
*   **`frontend/`**: Contains the Next.js (App Router, TypeScript) dashboard.
    *   Designed with the high-density Stitch UI Design System (Tailwind, Shadcn).
    *   Provides an Admin Portal (Telemetry, Audits) and a User Portal (SQL Workbench, Document Explorer).
*   **`terraform/`**: Modular Infrastructure-as-Code for AWS provisioning.
    *   Manages VPCs, EKS (Managed Node Groups), EBS CSI, IAM, and ECR.
*   **`helm/aroradb/` & `gitops/`**: Kubernetes deployments leveraging Gateway API, declarative StatefulSets, and Argo CD pipelines.

## Getting Started (Local Development)

You can run both the frontend and backend locally for development and testing.

### 1. Run the Backend (Go)

Navigate to the `backend` directory and run the main server entrypoint:

```bash
cd backend
go mod tidy
go run cmd/aroradb/main.go
```

### 2. Run the Frontend (Next.js)

Navigate to the `frontend` directory and start the React dev server:

```bash
cd frontend
npm install
npm run dev
```

Open your browser to `http://localhost:3000`. You can use the **Role Switcher** at the bottom of the left sidebar to toggle between the Admin and User portal experiences.

## Current Progress & Roadmap

- [x] **Phase 1: Foundation & Restructuring** (Completed)
  - Split monolith into `frontend/` (Next.js) and `backend/` (Go).
  - Designed the core interfaces (`StorageEngine`, `Module`, `TxManager`).
  - Scaffolding of Terraform modules and Helm templates for Kubernetes.
- [ ] **Phase 2: Authentication & Logic** (Upcoming)
  - Implement full database-backed User Models.
  - Wire up the frontend `/login` page to the backend `AuthMiddleware`.
- [ ] **Phase 3: Database Engine Implementation** (Upcoming)
  - Connect the `StorageEngine` to the underlying Bitcask data structures.
  - Implement B+ Tree, Inverted, and Vector (HNSW) index logic.
