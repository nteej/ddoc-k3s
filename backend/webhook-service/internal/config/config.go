package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port             string
	DatabaseURL      string
	KafkaBrokers     []string
	JWTPublicKeyPath string
	MaxRetries       int
	DeliveryWorkers  int
}

func Load() Config {
	maxRetries, _ := strconv.Atoi(getEnv("MAX_WEBHOOK_RETRIES", "5"))
	workers, _ := strconv.Atoi(getEnv("DELIVERY_WORKERS", "5"))

	return Config{
		Port:             getEnv("PORT", "8085"),
		DatabaseURL:      buildDatabaseURL(),
		KafkaBrokers:     strings.Split(getEnv("KAFKA_BROKERS", "kafka1:9092,kafka2:9093,kafka3:9094"), ","),
		JWTPublicKeyPath: getEnv("JWT_PUBLIC_KEY_PATH", "/etc/jwt/jwt-public.pem"),
		MaxRetries:       maxRetries,
		DeliveryWorkers:  workers,
	}
}

func buildDatabaseURL() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}
	host := getEnv("DB_HOST", "webhook-db")
	port := getEnv("DB_PORT", "5432")
	name := getEnv("DB_DATABASE", "webhook_service")
	user := getEnv("DB_USERNAME", "postgres")
	pass := getEnv("DB_PASSWORD", "postgres")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, name)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
