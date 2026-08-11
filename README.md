# AroraDB 🚀

AroraDB is an enterprise-grade, multi-model database SaaS platform built for high performance, cloud-native scalability, and an incredible developer experience.

It natively supports Key-Value, Relational SQL, JSON Documents, and Vector Embeddings within a unified, high-performance Go backend, paired with a stunning Next.js developer console.

## 🏗️ Architecture
AroraDB follows a strict modular architecture:
* **`/backend`**: The Go core. Features a Bitcask KV engine, B+ Tree/Inverted/Vector indexing overlays, ACID WAL durability, and a highly concurrent Token-Bucket tenant rate limiter.
* **`/frontend`**: The Next.js SaaS dashboard. Features interactive Multi-Model query studios, API Key management, and Admin topology visualization.
* **`/terraform` & `/helm`**: Production AWS EKS GitOps deployment pipelines via ArgoCD.
* **`.github/workflows`**: Automated CI/CD for linting, testing, and Docker image ECR deployments.

*(For a deep-dive into the engine design, read the [Architecture Knowledge Base](docs/architecture.md))*

## 🚀 Quick Start (Local Development)

### 1. Start the Go Backend
Ensure you have Go 1.26+ installed.
```bash
cd backend
go run cmd/aroradb/main.go --port 9000
```

### 2. Start the Next.js Frontend
Ensure you have Node.js and npm installed.
```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Dashboards
Open your browser and navigate to `http://localhost:3000`.
- **Admin Access:** Log in as `bhawuk` to view the Kubernetes Topology, Audit Logs, and Tenant Management dashboards.
- **User Access:** Log in as `mukul` to view the Multi-Model Studio, Quota usage, and generate API Keys.

## 🔒 Contributing & GitOps
All active feature development is currently taking place on the `develop` branch.
To contribute, create a feature branch off `develop` and open a Pull Request back into `develop`. Our GitHub Actions pipeline will automatically test your branch before it is merged and synced to AWS via ArgoCD.
