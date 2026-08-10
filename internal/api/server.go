package api

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"time"

	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/config"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/document"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/engine"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/logs"
	"github.com/BhawukHQ/Bhawuk-AroraDB/internal/metrics"
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
		// Bypass auth for static assets and healthcheck
		path := r.URL.Path
		if path == "/health" || path == "/" || path == "/style.css" || path == "/app.js" || path == "/favicon.ico" {
			next.ServeHTTP(w, r)
			return
		}

		if s.cfg.Token != "" {
			token := r.Header.Get("X-Arora-Token")
			if token == "" {
				// Also check query parameter
				token = r.URL.Query().Get("token")
			}
			if token != s.cfg.Token {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error": "Unauthorized: invalid or missing X-Arora-Token header"}`))
				return
			}
		}
		next.ServeHTTP(w, r)
	})
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

	// Send key-value response. If value is JSON, we can render it directly or as string.
	// We'll send raw value string or let dashboard parse it.
	sendJSON(w, http.StatusOK, map[string]string{
		"key":   key,
		"value": string(val),
	})
}

type putKVReq struct {
	Value string `json:"value"`
}

func (s *Server) handlePutKV(w http.ResponseWriter, r *http.Request) {
	s.tracker.IncWrites()
	key := r.PathValue("key")
	
	// Read payload
	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var val []byte
	// If Content-Type is json, try to extract {"value": "..."}
	if r.Header.Get("Content-Type") == "application/json" {
		var req putKVReq
		if err := json.Unmarshal(body, &req); err == nil {
			val = []byte(req.Value)
		} else {
			// fallback to raw body if JSON doesn't fit
			val = body
		}
	} else {
		val = body
	}

	if err := s.db.Put([]byte(key), val); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "key": key})
}

func (s *Server) handleDeleteKV(w http.ResponseWriter, r *http.Request) {
	s.tracker.IncDeletes()
	key := r.PathValue("key")
	if err := s.db.Delete([]byte(key)); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *Server) handleListCollections(w http.ResponseWriter, r *http.Request) {
	s.tracker.IncReads()
	cols, err := s.cm.ListCollections()
	if err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, cols)
}

func (s *Server) handleListDocuments(w http.ResponseWriter, r *http.Request) {
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
	s.tracker.IncWrites()
	col := r.PathValue("collection")
	id := r.URL.Query().Get("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	// Try to parse JSON to find or inject ID
	var doc map[string]interface{}
	if err := json.Unmarshal(body, &doc); err != nil {
		sendError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON payload: %v", err))
		return
	}

	if id == "" {
		// Try to read _id from document
		if docID, ok := doc["_id"].(string); ok && docID != "" {
			id = docID
		} else {
			// Generate unique string ID based on timestamp
			id = fmt.Sprintf("doc_%d", time.Now().UnixNano())
		}
	}

	if err := s.cm.Insert(col, id, body); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "_id": id})
}

func (s *Server) handleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	s.tracker.IncDeletes()
	col := r.PathValue("collection")
	id := r.PathValue("id")
	if err := s.cm.Delete(col, id); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *Server) handleQueryDocuments(w http.ResponseWriter, r *http.Request) {
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
	if err := s.db.Compact(); err != nil {
		sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "compaction completed successfully"})
}

func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	sendJSON(w, http.StatusOK, logs.GetBuffer().GetEntries())
}

func (s *Server) handleBackup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="aroradb-backup.zip"`)
	
	err := CreateBackupZip(s.cfg.DBDir, w)
	if err != nil {
		log.Printf("ERROR: database backup creation failed: %v", err)
	}
}

func (s *Server) handleRestore(w http.ResponseWriter, r *http.Request) {
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
		// attempt rollback reopen
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

	log.Println("Database hot restore completed successfully!")
	sendJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "database state restored successfully"})
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
