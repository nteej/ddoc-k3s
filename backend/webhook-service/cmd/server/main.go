package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"webhook-service/internal/config"
	"webhook-service/internal/consumer"
	"webhook-service/internal/db"
	"webhook-service/internal/delivery"
	"webhook-service/internal/middleware"
	"webhook-service/internal/registry"
	"webhook-service/internal/sse"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg := config.Load()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	pool := db.WaitAndConnect(ctx, cfg.DatabaseURL)
	if pool == nil {
		slog.Error("could not connect to database")
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		slog.Error("migration failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied")

	pubKey, err := middleware.LoadPublicKey(cfg.JWTPublicKeyPath)
	if err != nil {
		slog.Error("load public key", "path", cfg.JWTPublicKeyPath, "err", err)
		os.Exit(1)
	}

	hub := sse.NewHub()
	repo := registry.NewRepository(pool)
	regHandler := registry.NewHandler(repo)
	worker := delivery.New(pool, cfg.MaxRetries, cfg.DeliveryWorkers)

	worker.Run(ctx)

	go consumer.NewWebhookConsumer(cfg.KafkaBrokers, pool, repo).Run(ctx)
	go consumer.NewNotificationConsumer(cfg.KafkaBrokers, hub).Run(ctx)

	r := chi.NewRouter()
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(pubKey))
		r.Mount("/api/webhooks", regHandler.Routes())
		r.Get("/api/notifications/stream", func(w http.ResponseWriter, r *http.Request) {
			claims := middleware.GetClaims(r)
			hub.ServeSSE(w, r, claims.UserID)
		})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // disabled for SSE long-poll
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("webhook-service listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}
