package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

type contextKey string

const (
	AuthUserKey contextKey = "authUser"
)

// AuthConfig defines the configuration for the dual portal auth
type AuthConfig struct {
	JWTSecret string
}

// AuthMiddleware supports both Bearer tokens and hashed API Keys
func AuthMiddleware(config AuthConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			var userID string
			var err error

			if strings.HasPrefix(authHeader, "Bearer ") {
				// JWT Token for session-based portal access
				token := strings.TrimPrefix(authHeader, "Bearer ")
				userID, err = validateJWT(token, config.JWTSecret)
			} else if strings.HasPrefix(authHeader, "ardb_live_") {
				// API Key access
				userID, err = validateAPIKey(authHeader)
			} else {
				http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
				return
			}

			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Add user to context
			ctx := context.WithValue(r.Context(), AuthUserKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func validateJWT(token, secret string) (string, error) {
	// Dummy implementation for validation
	if token == "" {
		return "", errors.New("empty token")
	}
	return "admin-user", nil
}

func validateAPIKey(apiKey string) (string, error) {
	// Dummy implementation for validation (would hash and check DB)
	if apiKey == "" {
		return "", errors.New("empty api key")
	}
	return "api-user", nil
}
