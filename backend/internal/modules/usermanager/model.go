package usermanager

import "time"

type UserRole string

const (
	ROLE_ADMIN UserRole = "ROLE_ADMIN"
	ROLE_USER  UserRole = "ROLE_USER"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      UserRole  `json:"role"`
	Status    string    `json:"status"` // active, suspended
	CreatedAt time.Time `json:"created_at"`
}

type TenantQuota struct {
	TenantID       string `json:"tenant_id"`
	MaxStorageByte int64  `json:"max_storage_byte"`
	MaxRPS         int    `json:"max_rps"`
	MaxCollections int    `json:"max_collections"`
}

type UsageStats struct {
	TenantID       string `json:"tenant_id"`
	UsedStorage    int64  `json:"used_storage"`
	CurrentRPS     int    `json:"current_rps"`
	TotalRequests  int64  `json:"total_requests"`
	ErrorResponses int64  `json:"error_responses"`
}

type APIKey struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	KeyHash   string    `json:"-"`
	Prefix    string    `json:"prefix"` // e.g. ardb_live_xyz...
	Scopes    []string  `json:"scopes"` // read:sql, write:sql, etc.
	IPWhitelist []string `json:"ip_whitelist"`
	CreatedAt time.Time `json:"created_at"`
	LastUsed  time.Time `json:"last_used"`
}
