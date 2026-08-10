package api

import (
	"net/http"
	"sync"
	"time"
)

type AuditEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Action    string    `json:"action"`    // SQL_CREATE, KV_PUT, DOC_DELETE, etc.
	Target    string    `json:"target"`    // table_name / collection_name
	User      string    `json:"user"`      // username
	Details   string    `json:"details"`   // summary of statement
}

var (
	auditLogs   []AuditEntry
	auditLogsMu sync.RWMutex
	maxAudit    = 200
)

func LogAuditEvent(action, target, user, details string) {
	entry := AuditEntry{
		Timestamp: time.Now(),
		Action:    action,
		Target:    target,
		User:      user,
		Details:   details,
	}

	auditLogsMu.Lock()
	defer auditLogsMu.Unlock()

	auditLogs = append(auditLogs, entry)
	if len(auditLogs) > maxAudit {
		auditLogs = auditLogs[1:] // slice off oldest
	}
}

func handleGetAuditLogs(w http.ResponseWriter, r *http.Request) {
	// Security check: must be Project Admin
	token := r.Header.Get("X-Arora-Token")
	session, authenticated := GetSession(token)
	
	if !authenticated || session.Role != RoleProjectAdmin {
		sendError(w, http.StatusForbidden, "Forbidden: Only Project Admins can access audit logs")
		return
	}

	auditLogsMu.RLock()
	defer auditLogsMu.RUnlock()
	
	// Return in reverse chronological order
	reversed := make([]AuditEntry, len(auditLogs))
	for i, entry := range auditLogs {
		reversed[len(auditLogs)-1-i] = entry
	}

	sendJSON(w, http.StatusOK, reversed)
}
