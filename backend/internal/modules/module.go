package modules

import "context"

// RouteRegistrar defines the interface for registering HTTP routes
type RouteRegistrar interface {
	Handle(method, path string, handler interface{})
}

// Module defines the plug-and-play interface for database features.
// This enforces the Open-Closed Module Registry Pattern.
type Module interface {
	Name() string
	RegisterRoutes(router RouteRegistrar)
	OnShutdown(ctx context.Context) error
}
