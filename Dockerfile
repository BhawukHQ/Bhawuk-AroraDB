# Stage 1: Compile the Go binary
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY go.mod ./

# Copy source code (including embedded static assets in internal/api/web)
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Build statically compiled binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o aroradb ./cmd/aroradb

# Stage 2: Final lightweight image
FROM alpine:latest

# Install ca-certificates in case external integrations are needed
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from stage 1
COPY --from=builder /app/aroradb .

# Create database volume mount point
RUN mkdir /data

# Expose database API & UI port
EXPOSE 8080

# Run the database
ENTRYPOINT ["./aroradb", "-port", "8080", "-dir", "/data"]
