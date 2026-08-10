package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"
)

type UserRole string

const (
	RoleProjectAdmin UserRole = "admin_proj"
	RoleDBAdmin      UserRole = "admin_db"
	RoleDBUser       UserRole = "user_db"
	RoleVisitor      UserRole = "visitor"
)

type UserCredentials struct {
	Username string   `json:"username"`
	Password string   `json:"password"`
	Role     UserRole `json:"role"`
}

var (
	// Default Seeding
	usersDb = map[string]UserCredentials{
		"owner": {Username: "owner", Password: "admin123", Role: RoleProjectAdmin},
		"dba":   {Username: "dba", Password: "dba123", Role: RoleDBAdmin},
		"dev":   {Username: "dev", Password: "dev123", Role: RoleDBUser},
	}

	sessions = make(map[string]UserSession)
	sessMu   sync.RWMutex
)

type UserSession struct {
	Username string   `json:"username"`
	Role     UserRole `json:"role"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string   `json:"token"`
	Role  UserRole `json:"role"`
}

func generateSecureToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid login JSON body")
		return
	}

	user, exists := usersDb[req.Username]
	if !exists || user.Password != req.Password {
		sendError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token := generateSecureToken()
	
	sessMu.Lock()
	sessions[token] = UserSession{
		Username: user.Username,
		Role:     user.Role,
	}
	sessMu.Unlock()

	LogAuditEvent("USER_LOGIN", "users", user.Username, "User successfully authenticated session")

	sendJSON(w, http.StatusOK, loginResponse{
		Token: token,
		Role:  user.Role,
	})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-Arora-Token")
	if token == "" {
		sendJSON(w, http.StatusOK, map[string]bool{"success": true})
		return
	}

	sessMu.Lock()
	session, exists := sessions[token]
	if exists {
		LogAuditEvent("USER_LOGOUT", "users", session.Username, "User disconnected session")
		delete(sessions, token)
	}
	sessMu.Unlock()

	sendJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func GetSession(token string) (UserSession, bool) {
	sessMu.RLock()
	defer sessMu.RUnlock()
	sess, exists := sessions[token]
	return sess, exists
}
