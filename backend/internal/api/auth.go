package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
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
	// Default Fallback Seeding
	usersDb = map[string]UserCredentials{
		"owner": {Username: "owner", Password: "admin123", Role: RoleProjectAdmin},
		"dba":   {Username: "dba", Password: "dba123", Role: RoleDBAdmin},
		"dev":   {Username: "dev", Password: "dev123", Role: RoleDBUser},
	}

	sessions = make(map[string]UserSession)
	sessMu   sync.RWMutex
	
	userStore engine.StorageEngine
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

func InitUserDatabase(db engine.StorageEngine) {
	userStore = db

	// Check if the owner user exists in the KV store. If not, seed default users.
	ownerKey := []byte("_sys:user:owner")
	val, err := db.Get(ownerKey)
	if err == nil && val == nil {
		saveUserDirect(db, "owner", "admin123", RoleProjectAdmin)
		saveUserDirect(db, "dba", "dba123", RoleDBAdmin)
		saveUserDirect(db, "dev", "dev123", RoleDBUser)
	}
}

func saveUserDirect(db engine.StorageEngine, username, password string, role UserRole) {
	cred := UserCredentials{
		Username: username,
		Password: password,
		Role:     role,
	}
	b, _ := json.Marshal(cred)
	_ = db.Put([]byte("_sys:user:"+username), b)
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

	var user UserCredentials
	var found bool

	// Dynamic lookup from database
	if userStore != nil {
		userBytes, err := userStore.Get([]byte("_sys:user:" + req.Username))
		if err == nil && userBytes != nil {
			if err := json.Unmarshal(userBytes, &user); err == nil {
				found = true
			}
		}
	}

	// Fallback to in-memory default map if not found in DB
	if !found {
		var exists bool
		user, exists = usersDb[req.Username]
		if !exists {
			sendError(w, http.StatusUnauthorized, "invalid username or password")
			return
		}
	}

	if user.Password != req.Password {
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

// User Onboarding Management APIs (v4.5)

func handleListUsers(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-Arora-Token")
	session, authenticated := GetSession(token)
	if !authenticated || session.Role != RoleProjectAdmin {
		sendError(w, http.StatusForbidden, "Forbidden: Only Project Admins can access user lists")
		return
	}

	if userStore == nil {
		sendJSON(w, http.StatusOK, []UserCredentials{})
		return
	}

	kvs, err := userStore.Scan("_sys:user:")
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	list := []UserCredentials{}
	for _, kv := range kvs {
		var cred UserCredentials
		if err := json.Unmarshal([]byte(kv.Value), &cred); err == nil {
			cred.Password = "" // redact password hash for UI
			list = append(list, cred)
		}
	}
	sendJSON(w, http.StatusOK, list)
}

func handleCreateUser(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-Arora-Token")
	session, authenticated := GetSession(token)
	if !authenticated || session.Role != RoleProjectAdmin {
		sendError(w, http.StatusForbidden, "Forbidden: Only Project Admins can onboard users")
		return
	}

	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req UserCredentials
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" || req.Role == "" {
		sendError(w, http.StatusBadRequest, "username, password, and role are required")
		return
	}

	if userStore == nil {
		sendError(w, http.StatusInternalServerError, "database engine not initialized")
		return
	}

	b, _ := json.Marshal(req)
	err := userStore.Put([]byte("_sys:user:"+req.Username), b)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	LogAuditEvent("USER_ONBOARD", "users", session.Username, fmt.Sprintf("Onboarded new database user '%s' with role '%s'", req.Username, req.Role))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "username": req.Username})
}

func handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-Arora-Token")
	session, authenticated := GetSession(token)
	if !authenticated || session.Role != RoleProjectAdmin {
		sendError(w, http.StatusForbidden, "Forbidden: Only Project Admins can offboard users")
		return
	}

	if r.Method != http.MethodDelete {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	username := r.PathValue("username")
	if username == "" {
		username = r.URL.Query().Get("username")
	}

	if username == "owner" {
		sendError(w, http.StatusBadRequest, "Cannot delete the project owner user")
		return
	}

	if userStore == nil {
		sendError(w, http.StatusInternalServerError, "database engine not initialized")
		return
	}

	err := userStore.Delete([]byte("_sys:user:" + username))
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	LogAuditEvent("USER_OFFBOARD", "users", session.Username, fmt.Sprintf("Offboarded database user '%s'", username))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}
