package config

import (
	"flag"
	"os"
	"strconv"
)

type Config struct {
	Port        int
	DBDir       string
	Token               string
	MaxFileSize         int64
	CognitoClientID     string
	CognitoClientSecret string
	CognitoRedirectURL  string
	CognitoIssuerURL    string
}

// Load loads settings from CLI arguments and environment variables.
func Load() *Config {
	cfg := &Config{}

	// Defaults
	defaultPort := 8080
	if envPort := os.Getenv("ARORADB_PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			defaultPort = p
		}
	}

	defaultDBDir := "./data"
	if envDir := os.Getenv("ARORADB_DIR"); envDir != "" {
		defaultDBDir = envDir
	}

	defaultToken := os.Getenv("ARORADB_TOKEN")

	defaultMaxFileSize := int64(10 * 1024 * 1024) // 10MB
	if envSize := os.Getenv("ARORADB_MAX_FILE_SIZE"); envSize != "" {
		if s, err := strconv.ParseInt(envSize, 10, 64); err == nil {
			defaultMaxFileSize = s
		}
	}

	flag.IntVar(&cfg.Port, "port", defaultPort, "Port to run the AroraDB server on")
	flag.StringVar(&cfg.DBDir, "dir", defaultDBDir, "Directory to store database data files")
	flag.StringVar(&cfg.Token, "token", defaultToken, "Security token for requests (empty to disable auth)")
	flag.Int64Var(&cfg.MaxFileSize, "max-size", defaultMaxFileSize, "Max size in bytes for a single data file before rotation")
	flag.StringVar(&cfg.CognitoClientID, "cognito-client-id", os.Getenv("ARORADB_COGNITO_CLIENT_ID"), "AWS Cognito Client ID")
	flag.StringVar(&cfg.CognitoClientSecret, "cognito-client-secret", os.Getenv("ARORADB_COGNITO_CLIENT_SECRET"), "AWS Cognito Client Secret")
	flag.StringVar(&cfg.CognitoRedirectURL, "cognito-redirect-url", os.Getenv("ARORADB_COGNITO_REDIRECT_URL"), "AWS Cognito Redirect URL")
	flag.StringVar(&cfg.CognitoIssuerURL, "cognito-issuer-url", os.Getenv("ARORADB_COGNITO_ISSUER_URL"), "AWS Cognito Issuer URL")
	flag.Parse()

	return cfg
}
