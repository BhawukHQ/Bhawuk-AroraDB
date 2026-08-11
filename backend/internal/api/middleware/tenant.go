package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"
)

type TenantContextKey string
const TenantIDKey TenantContextKey = "tenantID"
const ScopesKey TenantContextKey = "scopes"

// Mock dependencies for quotas and usage
type QuotaManager interface {
	GetMaxStorage(tenantID string) int64
	GetUsedStorage(tenantID string) int64
}

type TokenBucket struct {
	tokens         int
	maxTokens      int
	refillRate     int // tokens per second
	lastRefillTime time.Time
	mu             sync.Mutex
}

func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastRefillTime).Seconds()
	
	tb.tokens += int(elapsed * float64(tb.refillRate))
	if tb.tokens > tb.maxTokens {
		tb.tokens = tb.maxTokens
	}
	tb.lastRefillTime = now

	if tb.tokens > 0 {
		tb.tokens--
		return true
	}
	return false
}

type TenantMiddleware struct {
	buckets map[string]*TokenBucket
	mu      sync.RWMutex
	quota   QuotaManager
}

func NewTenantMiddleware(quota QuotaManager) *TenantMiddleware {
	return &TenantMiddleware{
		buckets: make(map[string]*TokenBucket),
		quota:   quota,
	}
}

func (tm *TenantMiddleware) getBucket(tenantID string, rps int) *TokenBucket {
	tm.mu.RLock()
	bucket, exists := tm.buckets[tenantID]
	tm.mu.RUnlock()

	if exists {
		return bucket
	}

	tm.mu.Lock()
	defer tm.mu.Unlock()
	bucket = &TokenBucket{
		tokens:         rps,
		maxTokens:      rps,
		refillRate:     rps,
		lastRefillTime: time.Now(),
	}
	tm.buckets[tenantID] = bucket
	return bucket
}

func (tm *TenantMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mock extracting from context (set by AuthMiddleware)
		tenantID := "demo-tenant-1" // In reality, extracted from JWT or API Key
		rpsLimit := 100 // Extracted from DB based on tenant tier

		// 1. Rate Limiting
		bucket := tm.getBucket(tenantID, rpsLimit)
		if !bucket.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		// 2. Storage Quota Enforcement on Writes
		if r.Method == http.MethodPut || r.Method == http.MethodPost {
			max := tm.quota.GetMaxStorage(tenantID)
			used := tm.quota.GetUsedStorage(tenantID)
			if used >= max {
				http.Error(w, "Storage Quota Exceeded", http.StatusForbidden)
				return
			}
		}

		// 3. Set Context
		ctx := context.WithValue(r.Context(), TenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
