package modules

import (
	"context"
	"log"
)

type Registry struct {
	modules []Module
	router  RouteRegistrar
}

func NewRegistry(router RouteRegistrar) *Registry {
	return &Registry{
		modules: make([]Module, 0),
		router:  router,
	}
}

func (r *Registry) Register(m Module) {
	log.Printf("Registering module: %s\n", m.Name())
	m.RegisterRoutes(r.router)
	r.modules = append(r.modules, m)
}

func (r *Registry) Shutdown(ctx context.Context) {
	for _, m := range r.modules {
		if err := m.OnShutdown(ctx); err != nil {
			log.Printf("Error shutting down module %s: %v", m.Name(), err)
		}
	}
}
