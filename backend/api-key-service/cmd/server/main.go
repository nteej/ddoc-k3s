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
	"github.com/redis/go-redis/v9"
	kafka "github.com/segmentio/kafka-go"

	"api-key-service/internal/config"
	"api-key-service/internal/db"
	appjwt "api-key-service/internal/jwt"
	"api-key-service/internal/keystore"
	"api-key-service/internal/middleware"
	"api-key-service/internal/quota"
	"api-key-service/internal/ratelimit"
	"api-key-service/internal/usage"
	"api-key-service/internal/validate"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg := config.Load()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	ownPool := db.WaitAndConnect(ctx, cfg.OwnDatabaseURL)
	if ownPool == nil {
		slog.Error("could not connect to own database")
		os.Exit(1)
	}
	defer ownPool.Close()

	if err := db.Migrate(ctx, ownPool); err != nil {
		slog.Error("migration failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied")

	userPool := db.WaitAndConnect(ctx, cfg.UserDatabaseURL)
	if userPool == nil {
		slog.Error("could not connect to user database")
		os.Exit(1)
	}
	defer userPool.Close()

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	defer rdb.Close()

	kafkaWriter := &kafka.Writer{
		Addr:                   kafka.TCP(cfg.KafkaBrokers...),
		Topic:                  "quota.exceeded",
		AllowAutoTopicCreation: false,
	}
	defer kafkaWriter.Close()

	signer, err := appjwt.NewSigner(cfg.JWTPrivateKeyPath, 30*time.Second)
	if err != nil {
		slog.Error("load private key", "path", cfg.JWTPrivateKeyPath, "err", err)
		os.Exit(1)
	}

	pubKey, err := middleware.LoadPublicKey(cfg.JWTPublicKeyPath)
	if err != nil {
		slog.Error("load public key", "path", cfg.JWTPublicKeyPath, "err", err)
		os.Exit(1)
	}

	store := keystore.New(userPool, rdb, time.Duration(cfg.KeyCacheTTLSeconds)*time.Second)
	limiter := ratelimit.New(rdb, cfg.DefaultRateLimit)
	tracker := quota.NewTracker(ownPool, rdb, kafkaWriter, cfg.DefaultMonthlyQuota)

	go quota.NewConsumer(cfg.KafkaBrokers, tracker).Run(ctx)

	validateHandler := validate.NewHandler(store, limiter, tracker, signer, cfg.DefaultRateLimit)
	usageHandler := usage.NewHandler(tracker)

	r := chi.NewRouter()
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Internal route — called by Kong pre-function (no auth required).
	r.Get("/internal/validate", validateHandler.ServeHTTP)

	// Management routes — protected by JWT.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(pubKey))
		r.Get("/api/usage", usageHandler.ServeHTTP)
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("api-key-service listening", "port", cfg.Port)
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
