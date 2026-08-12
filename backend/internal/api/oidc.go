package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// ALB Cognito headers
const (
	HeaderALBIdentity = "x-amzn-oidc-identity"
	HeaderALBData     = "x-amzn-oidc-data"
)

// CognitoALBMiddleware intercepts requests to parse ALB headers
func (s *Server) CognitoALBMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to read from ALB headers first
		oidcData := r.Header.Get(HeaderALBData)
		
		if oidcData != "" {
			// Extract claims from ALB JWT
			parts := strings.Split(oidcData, ".")
			if len(parts) == 3 {
				payload, err := base64.RawURLEncoding.DecodeString(parts[1])
				if err == nil {
					var claims struct {
						Username string `json:"username"`
						Email    string `json:"email"`
					}
					if err := json.Unmarshal(payload, &claims); err == nil {
						username := claims.Username
						if username == "" {
							username = claims.Email
						}

						// Auto-register in DB if new
						userKey := []byte("_sys:user:" + username)
						val, err := s.db.Get(userKey)
						if err == nil && val == nil {
							saveUserDirect(s.db, username, "oidc-managed", RoleDBUser)
						}

						// Create/update local session cookie so frontend reads it
						// ALB handles the real session, but frontend AuthContext wants to know who we are
						http.SetCookie(w, &http.Cookie{
							Name:     "aroradb_user",
							Value:    username,
							Path:     "/",
							Expires:  time.Now().Add(1 * time.Hour),
							HttpOnly: false,
						})
						http.SetCookie(w, &http.Cookie{
							Name:     "aroradb_role",
							Value:    string(RoleDBUser),
							Path:     "/",
							Expires:  time.Now().Add(1 * time.Hour),
							HttpOnly: false,
						})

						// Pass control to next handler
						next.ServeHTTP(w, r)
						return
					}
				}
			}
		}

		// Fallback for local development or non-ALB requests: just pass through.
		// (In true prod, you might block if header is missing, but we leave open for fallback auth)
		next.ServeHTTP(w, r)
	})
}

// Since ALB handles login/logout, we no longer need the OAuth callback routes.
// We can provide a mock login for local dev or just return an error if called directly.
func (s *Server) handleCognitoLogin(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Login is handled by AWS ALB Ingress", http.StatusNotImplemented)
}

func (s *Server) handleCognitoCallback(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Callback is handled by AWS ALB Ingress", http.StatusNotImplemented)
}

func (s *Server) handleCognitoLogout(w http.ResponseWriter, r *http.Request) {
	// Clear frontend state cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "aroradb_user",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: false,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "aroradb_role",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: false,
	})
	
	// Redirect to Cognito logout 
	http.Redirect(w, r, "https://"+s.cfg.CognitoIssuerURL+"/logout?client_id="+s.cfg.CognitoClientID+"&logout_uri="+s.cfg.CognitoRedirectURL, http.StatusFound)
}
