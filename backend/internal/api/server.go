package api

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/config"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/document"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/logs"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/metrics"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/sql"
)

//go:embed web
var webAssets embed.FS

type Server struct {
	cfg        *config.Config
	db         engine.StorageEngine
	cm         *document.CollectionManager
	tracker    *metrics.Tracker
	httpServer *http.Server
}

func NewServer(cfg *config.Config, db engine.StorageEngine) *Server {
	return &Server{
		cfg:     cfg,
		db:      db,
		cm:      document.NewCollectionManager(db),
		tracker: metrics.GetTracker(),
	}
}

// Start boots up the HTTP API server.
func (s *Server) Start() error {
	InitUserDatabase(s.db)
	mux := http.NewServeMux()

	// Register API Routes
	// Core API
	mux.HandleFunc("GET /api/kv", s.handleListKV)
	mux.HandleFunc("GET /api/kv/{key}", s.handleGetKV)
	mux.HandleFunc("POST /api/kv/{key}", s.handlePutKV)
	mux.HandleFunc("DELETE /api/kv/{key}", s.handleDeleteKV)

	// Document API
	mux.HandleFunc("GET /api/collections", s.handleListCollections)
	mux.HandleFunc("GET /api/documents/{collection}", s.handleListDocuments)
	mux.HandleFunc("POST /api/documents/{collection}", s.handlePutDocument)
	mux.HandleFunc("GET /api/documents/{collection}/{id}", s.handleGetDocument)
	mux.HandleFunc("DELETE /api/documents/{collection}/{id}", s.handleDeleteDocument)
	mux.HandleFunc("POST /api/documents/{collection}/query", s.handleQueryDocuments)

	// System API
	mux.HandleFunc("GET /api/metrics", s.handleMetrics)
	mux.HandleFunc("GET /api/logs", s.handleGetLogs)
	mux.HandleFunc("POST /api/admin/compact", s.handleCompact)
	mux.HandleFunc("GET /api/admin/backup", s.handleBackup)
	mux.HandleFunc("POST /api/admin/restore", s.handleRestore)
	mux.HandleFunc("GET /health", s.handleHealth)

	// SQL Query Engine API
	mux.HandleFunc("POST /api/sql", s.handleSQLQuery)
	mux.HandleFunc("GET /api/sql/tables", s.handleSQLTables)

	// User Auth API
	mux.HandleFunc("POST /api/auth/login", handleLogin)
	mux.HandleFunc("POST /api/auth/logout", handleLogout)
	mux.HandleFunc("GET /api/admin/audit", handleGetAuditLogs)
	
	// User Onboarding Management API
	mux.HandleFunc("GET /api/admin/users", handleListUsers)
	mux.HandleFunc("POST /api/admin/users", handleCreateUser)
	mux.HandleFunc("DELETE /api/admin/users/{username}", handleDeleteUser)

	// Serve Static Files from embedded web UI
	subFS, err := fs.Sub(webAssets, "web")
	if err != nil {
		log.Fatalf("CRITICAL: failed to read embedded web assets: %v", err)
	}
	fileServer := http.FileServer(http.FS(subFS))
	mux.Handle("GET /", fileServer)

	// Wrap handlers with middleware
	var handler http.Handler = mux
	handler = s.authMiddleware(handler)
	handler = s.corsMiddleware(handler)
	handler = s.loggingMiddleware(handler)

	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("AroraDB server starting on port %d...", s.cfg.Port)
	log.Printf("Admin Dashboard available at http://localhost:%d/", s.cfg.Port)
	if s.cfg.Token != "" {
		log.Println("Security token: ENABLED")
	} else {
		log.Println("Security token: DISABLED (Use --token or ARORADB_TOKEN environment variable to secure)")
	}

	return s.httpServer.ListenAndServe()
}

// Stop shuts down the server.
func (s *Server) Stop() error {
	if s.httpServer != nil {
		return s.httpServer.Close()
	}
	return nil
}

// Middleware
func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		
		// Bypass auth for login, logout, static assets, and healthcheck
		if path == "/health" || path == "/" || path == "/api/auth/login" || 
			path == "/favicon.svg" || strings.HasPrefix(path, "/assets/") {
			next.ServeHTTP(w, r)
			return
		}

		token := r.Header.Get("X-Arora-Token")
		if token == "" {
			token = r.URL.Query().Get("token")
		}

		// 1. Validate custom login session
		if _, exists := GetSession(token); exists {
			next.ServeHTTP(w, r)
			return
		}

		// 2. Validate global configuration token if configured
		if s.cfg.Token != "" && token == s.cfg.Token {
			next.ServeHTTP(w, r)
			return
		}

		// Unauthorized
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error": "Unauthorized: missing or invalid session token"}`))
	})
}

func (s *Server) resolveSession(r *http.Request) (UserSession, bool) {
	token := r.Header.Get("X-Arora-Token")
	if token == "" {
		token = r.URL.Query().Get("token")
	}

	session, exists := GetSession(token)
	if !exists {
		// If no global security token is set, bypass as admin_proj
		if s.cfg.Token == "" {
			return UserSession{Username: "system_bypass", Role: RoleProjectAdmin}, true
		}
		return UserSession{}, false
	}
	return session, true
}

func (s *Server) checkRole(w http.ResponseWriter, r *http.Request, allowedRoles ...UserRole) (UserSession, bool) {
	session, authenticated := s.resolveSession(r)
	if !authenticated {
		sendError(w, http.StatusUnauthorized, "Unauthorized: missing or invalid session token")
		return UserSession{}, false
	}

	// admin_proj bypasses all constraints
	if session.Role == RoleProjectAdmin {
		return session, true
	}

	for _, role := range allowedRoles {
		if session.Role == role {
			return session, true
		}
	}

	sendError(w, http.StatusForbidden, "Forbidden: insufficient role permissions")
	return UserSession{}, false
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Arora-Token")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s in %v", r.Method, r.URL.Path, time.Since(start))
	})
}

// Handlers
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	sendJSON(w, http.StatusOK, map[string]string{"status": "healthy", "version": "1.0.0", "db": "AroraDB"})
}

func (s *Server) handleListKV(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncReads()
	prefix := r.URL.Query().Get("prefix")
	kvs, err := s.db.Scan(prefix)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, kvs)
}

func (s *Server) handleGetKV(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncReads()
	key := r.PathValue("key")
	val, err := s.db.Get([]byte(key))
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if val == nil {
		sendError(w, http.StatusNotFound, "key not found")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{
		"key":   key,
		"value": string(val),
	})
}

type putKVReq struct {
	Value string `json:"value"`
}

func (s *Server) handlePutKV(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r, RoleDBAdmin)
	if !allowed {
		return
	}
	s.tracker.IncWrites()
	key := r.PathValue("key")
	
	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var val []byte
	if r.Header.Get("Content-Type") == "application/json" {
		var req putKVReq
		if err := json.Unmarshal(body, &req); err == nil {
			val = []byte(req.Value)
		} else {
			val = body
		}
	} else {
		val = body
	}

	if err := s.db.Put([]byte(key), val); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	preview := string(val)
	if len(preview) > 25 {
		preview = preview[:25] + "..."
	}
	LogAuditEvent("KV_PUT", "keys", session.Username, fmt.Sprintf("Wrote key '%s' = '%s'", key, preview))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "key": key})
}

func (s *Server) handleDeleteKV(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r, RoleDBAdmin)
	if !allowed {
		return
	}
	s.tracker.IncDeletes()
	key := r.PathValue("key")
	if err := s.db.Delete([]byte(key)); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	LogAuditEvent("KV_DELETE", "keys", session.Username, fmt.Sprintf("Deleted key '%s'", key))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *Server) handleListCollections(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncReads()
	cols, err := s.cm.ListCollections()
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, cols)
}

func (s *Server) handleListDocuments(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncReads()
	col := r.PathValue("collection")
	docs, err := s.cm.ListAll(col)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, docs)
}

func (s *Server) handleGetDocument(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncReads()
	col := r.PathValue("collection")
	id := r.PathValue("id")
	docBytes, err := s.cm.Get(col, id)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if docBytes == nil {
		sendError(w, http.StatusNotFound, "document not found")
		return
	}

	var doc map[string]interface{}
	_ = json.Unmarshal(docBytes, &doc)
	sendJSON(w, http.StatusOK, doc)
}

func (s *Server) handlePutDocument(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r, RoleDBAdmin)
	if !allowed {
		return
	}
	s.tracker.IncWrites()
	col := r.PathValue("collection")
	id := r.URL.Query().Get("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var doc map[string]interface{}
	if err := json.Unmarshal(body, &doc); err != nil {
		sendError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON payload: %v", err))
		return
	}

	if id == "" {
		if docID, ok := doc["_id"].(string); ok && docID != "" {
			id = docID
		} else {
			id = fmt.Sprintf("doc_%d", time.Now().UnixNano())
		}
	}

	if err := s.cm.Insert(col, id, body); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	LogAuditEvent("DOC_PUT", col, session.Username, fmt.Sprintf("Wrote document ID '%s'", id))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "_id": id})
}

func (s *Server) handleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r, RoleDBAdmin)
	if !allowed {
		return
	}
	s.tracker.IncDeletes()
	col := r.PathValue("collection")
	id := r.PathValue("id")
	if err := s.cm.Delete(col, id); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	LogAuditEvent("DOC_DELETE", col, session.Username, fmt.Sprintf("Deleted document ID '%s'", id))

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *Server) handleQueryDocuments(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	s.tracker.IncQueries()
	col := r.PathValue("collection")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var filter map[string]interface{}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &filter); err != nil {
			sendError(w, http.StatusBadRequest, "invalid query filter JSON")
			return
		}
	}

	docs, err := s.cm.Query(col, filter)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, docs)
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	sysStats := s.tracker.GetSystemStats()
	keyCount, dbSize, fileCount := s.db.Stats()
	compactionRatio := s.db.CompactionRatio()

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"system":           sysStats,
		"key_count":        keyCount,
		"db_size_bytes":    dbSize,
		"file_count":       fileCount,
		"compaction_ratio": compactionRatio,
	})
}

func (s *Server) handleCompact(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r) // only admin_proj allowed
	if !allowed {
		return
	}
	if err := s.db.Compact(); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	LogAuditEvent("DB_COMPACT", "system", session.Username, "Manual storage engine compaction triggered")
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "compaction completed successfully"})
}

func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r); !allowed {
		return
	}
	sendJSON(w, http.StatusOK, logs.GetBuffer().GetEntries())
}

func (s *Server) handleBackup(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r)
	if !allowed {
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="aroradb-backup.zip"`)
	
	err := CreateBackupZip(s.cfg.DBDir, w)
	if err != nil {
		log.Printf("ERROR: database backup creation failed: %v", err)
	} else {
		LogAuditEvent("DB_BACKUP", "system", session.Username, "Database zip archive backup downloaded")
	}
}

func (s *Server) handleRestore(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r)
	if !allowed {
		return
	}
	log.Println("Initiating database hot restore...")
	
	err := r.ParseMultipartForm(20 * 1024 * 1024) // 20MB max
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}

	file, _, err := r.FormFile("backup")
	if err != nil {
		sendError(w, http.StatusBadRequest, "missing backup file in request payload")
		return
	}
	defer file.Close()

	log.Println("Closing database storage engine for restore...")
	if err := s.db.Close(); err != nil {
		sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to close database engine: %v", err))
		return
	}

	log.Println("Unzipping restored database files...")
	if err := RestoreBackupZip(s.cfg.DBDir, file); err != nil {
		dbEngine, _ := engine.NewEngine(s.cfg.DBDir, s.cfg.MaxFileSize)
		if dbEngine != nil {
			s.db = dbEngine
			s.cm = document.NewCollectionManager(s.db)
		}
		sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to restore archive contents: %v", err))
		return
	}

	log.Println("Re-initializing storage engine index...")
	dbEngine, err := engine.NewEngine(s.cfg.DBDir, s.cfg.MaxFileSize)
	if err != nil {
		sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to hot-reload storage index: %v", err))
		return
	}

	s.db = dbEngine
	s.cm = document.NewCollectionManager(s.db)

	LogAuditEvent("DB_RESTORE", "system", session.Username, "Database hot-reload restore executed successfully")

	log.Println("Database hot restore completed successfully!")
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "database state restored successfully"})
}

type sqlRequest struct {
	Query string `json:"query"`
}

func (s *Server) handleSQLQuery(w http.ResponseWriter, r *http.Request) {
	session, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser)
	if !allowed {
		return
	}
	s.tracker.IncQueries()
	
	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req sqlRequest
	if err := json.Unmarshal(body, &req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid request JSON body")
		return
	}

	// Security Check: restricted queries for DB User role
	if session.Role == RoleDBUser {
		queryUpper := strings.ToUpper(strings.TrimSpace(req.Query))
		if !strings.HasPrefix(queryUpper, "SELECT") {
			sendError(w, http.StatusForbidden, "Forbidden: Database users are restricted to read-only queries (SELECT).")
			return
		}
	}

	result, err := sql.ExecuteStatement(s.db, req.Query)
	if err != nil {
		sendError(w, http.StatusBadRequest, err.Error())
		return
	}

	preview := req.Query
	if len(preview) > 50 {
		preview = preview[:50] + "..."
	}
	LogAuditEvent("SQL_EXECUTE", "sql", session.Username, fmt.Sprintf("Executed SQL: %s", preview))

	sendJSON(w, http.StatusOK, result)
}

func (s *Server) handleSQLTables(w http.ResponseWriter, r *http.Request) {
	if _, allowed := s.checkRole(w, r, RoleDBAdmin, RoleDBUser); !allowed {
		return
	}
	tables, err := sql.ListTables(s.db)
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, tables)
}

// Helpers
func sendJSON(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(data)
}

func sendError(w http.ResponseWriter, code int, msg string) {
	sendJSON(w, code, map[string]string{"error": msg})
}
