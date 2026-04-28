package keystore

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type KeyInfo struct {
	ID             string
	OrganizationID string
	OrgSlug        string
	Name           string
	Role           string
	ExpiresAt      *time.Time
}

type Store struct {
	userDB  *pgxpool.Pool
	redis   *redis.Client
	cacheTTL time.Duration
}

func New(userDB *pgxpool.Pool, rdb *redis.Client, cacheTTL time.Duration) *Store {
	return &Store{userDB: userDB, redis: rdb, cacheTTL: cacheTTL}
}

func (s *Store) Validate(ctx context.Context, rawKey string) (*KeyInfo, error) {
	h := fmt.Sprintf("%x", sha256.Sum256([]byte(rawKey)))
	cacheKey := "apikey:" + h

	// Try Redis cache first.
	cached, err := s.redis.Get(ctx, cacheKey).Bytes()
	if err == nil {
		var info KeyInfo
		if jsonErr := json.Unmarshal(cached, &info); jsonErr == nil {
			if info.ExpiresAt != nil && time.Now().After(*info.ExpiresAt) {
				s.redis.Del(ctx, cacheKey)
				return nil, nil
			}
			return &info, nil
		}
	}

	// Cache miss — query user-db.
	info, err := s.fetchFromDB(ctx, h)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, nil
	}

	// Populate cache (don't cache expired keys).
	if info.ExpiresAt == nil || time.Now().Before(*info.ExpiresAt) {
		if data, err := json.Marshal(info); err == nil {
			s.redis.Set(ctx, cacheKey, data, s.cacheTTL)
		}
	}
	return info, nil
}

// InvalidateCache removes a cached key entry (call on revocation).
func (s *Store) InvalidateCache(ctx context.Context, rawKey string) {
	h := fmt.Sprintf("%x", sha256.Sum256([]byte(rawKey)))
	s.redis.Del(ctx, "apikey:"+h)
}

func (s *Store) fetchFromDB(ctx context.Context, keyHash string) (*KeyInfo, error) {
	row := s.userDB.QueryRow(ctx, `
		SELECT k.id, k.organization_id, k.name, k.role, k.expires_at,
		       COALESCE(o.slug, '')
		FROM api_keys k
		LEFT JOIN organizations o ON o.id = k.organization_id
		WHERE k.key_hash = $1
	`, keyHash)

	var info KeyInfo
	var expiresAt *time.Time
	if err := row.Scan(&info.ID, &info.OrganizationID, &info.Name, &info.Role, &expiresAt, &info.OrgSlug); err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		slog.Error("keystore db query", "err", err)
		return nil, fmt.Errorf("db: %w", err)
	}
	info.ExpiresAt = expiresAt
	return &info, nil
}
