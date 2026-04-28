package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                 string
	OwnDatabaseURL       string
	UserDatabaseURL      string
	RedisAddr            string
	KafkaBrokers         []string
	JWTPrivateKeyPath    string
	JWTPublicKeyPath     string
	DefaultRateLimit     int
	DefaultMonthlyQuota  int
	KeyCacheTTLSeconds   int
}

func Load() Config {
	rateLimit, _ := strconv.Atoi(getEnv("DEFAULT_RATE_LIMIT_PER_MINUTE", "60"))
	quota, _ := strconv.Atoi(getEnv("DEFAULT_MONTHLY_QUOTA", "1000"))
	cacheTTL, _ := strconv.Atoi(getEnv("KEY_CACHE_TTL_SECONDS", "300"))

	return Config{
		Port:                getEnv("PORT", "8086"),
		OwnDatabaseURL:      buildDSN("OWN_DB", "api-key-db", "apikey_service"),
		UserDatabaseURL:     buildDSN("USER_DB", "user-db", "user_service"),
		RedisAddr:           getEnv("REDIS_ADDR", "redis:6379"),
		KafkaBrokers:        strings.Split(getEnv("KAFKA_BROKERS", "kafka1:9092,kafka2:9093,kafka3:9094"), ","),
		JWTPrivateKeyPath:   getEnv("JWT_PRIVATE_KEY_PATH", "/etc/jwt/jwt-private.pem"),
		JWTPublicKeyPath:    getEnv("JWT_PUBLIC_KEY_PATH", "/etc/jwt/jwt-public.pem"),
		DefaultRateLimit:    rateLimit,
		DefaultMonthlyQuota: quota,
		KeyCacheTTLSeconds:  cacheTTL,
	}
}

func buildDSN(envPrefix, defaultHost, defaultDB string) string {
	if url := os.Getenv(envPrefix + "_URL"); url != "" {
		return url
	}
	host := getEnv(envPrefix+"_HOST", defaultHost)
	port := getEnv(envPrefix+"_PORT", "5432")
	name := getEnv(envPrefix+"_DATABASE", defaultDB)
	user := getEnv(envPrefix+"_USERNAME", "postgres")
	pass := getEnv(envPrefix+"_PASSWORD", "postgres")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, name)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
