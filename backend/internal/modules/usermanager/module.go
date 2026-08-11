package usermanager

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/modules"
)

type UserManagerModule struct{}

func NewUserManagerModule() modules.Module {
	return &UserManagerModule{}
}

func (m *UserManagerModule) Name() string {
	return "UserManager"
}

func (m *UserManagerModule) RegisterRoutes(router modules.RouteRegistrar) {
	// Admin Endpoints
	router.Handle("GET", "/api/v1/admin/users", m.handleGetUsers)
	router.Handle("PATCH", "/api/v1/admin/users/{id}/quota", m.handleUpdateQuota)
	router.Handle("POST", "/api/v1/admin/users/{id}/status", m.handleUpdateStatus)
	router.Handle("GET", "/api/v1/admin/analytics/overview", m.handleAnalyticsOverview)

	// User Endpoints
	router.Handle("GET", "/api/v1/user/stats", m.handleUserStats)
	router.Handle("GET", "/api/v1/user/keys", m.handleGetKeys)
	router.Handle("POST", "/api/v1/user/keys", m.handleGenerateKey)
	router.Handle("DELETE", "/api/v1/user/keys/{id}", m.handleRevokeKey)
	router.Handle("POST", "/api/v1/user/keys/whitelist", m.handleWhitelistIP)
}

func (m *UserManagerModule) OnShutdown(ctx context.Context) error {
	return nil
}

// Handlers (Mock logic for Phase 2 API contract)

func (m *UserManagerModule) handleGetUsers(w http.ResponseWriter, r *http.Request) {
	// Mock returning a list of users
	users := []User{
		{ID: "usr_1", Email: "bhawuk@aroradb.io", Role: ROLE_ADMIN, Status: "active"},
		{ID: "usr_2", Email: "mukul@aroradb.io", Role: ROLE_USER, Status: "active"},
	}
	json.NewEncoder(w).Encode(users)
}

func (m *UserManagerModule) handleUpdateQuota(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (m *UserManagerModule) handleUpdateStatus(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (m *UserManagerModule) handleAnalyticsOverview(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{
		"total_tenants": 2,
		"total_storage": 1024 * 1024 * 1024 * 15, // 15GB
		"global_rps":    1500,
		"latency_p50":   5.2,
		"latency_p99":   12.4,
	}
	json.NewEncoder(w).Encode(stats)
}

func (m *UserManagerModule) handleUserStats(w http.ResponseWriter, r *http.Request) {
	stats := UsageStats{
		TenantID:       "demo-tenant-1",
		UsedStorage:    1024 * 1024 * 500, // 500MB
		CurrentRPS:     42,
		TotalRequests:  150239,
		ErrorResponses: 23,
	}
	json.NewEncoder(w).Encode(stats)
}

func (m *UserManagerModule) handleGetKeys(w http.ResponseWriter, r *http.Request) {
	keys := []APIKey{
		{ID: "key_1", Prefix: "ardb_live_f3x...", Scopes: []string{"read:sql", "write:sql"}},
	}
	json.NewEncoder(w).Encode(keys)
}

func (m *UserManagerModule) handleGenerateKey(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

func (m *UserManagerModule) handleRevokeKey(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (m *UserManagerModule) handleWhitelistIP(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}
