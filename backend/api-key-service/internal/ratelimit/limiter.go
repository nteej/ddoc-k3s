package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Limiter struct {
	rdb          *redis.Client
	defaultLimit int
}

func New(rdb *redis.Client, defaultLimit int) *Limiter {
	return &Limiter{rdb: rdb, defaultLimit: defaultLimit}
}

// Allow checks the sliding-window rate limit for a given key ID.
// Returns (allowed, remaining, error).
func (l *Limiter) Allow(ctx context.Context, keyID string, limit int) (bool, int, error) {
	if limit <= 0 {
		limit = l.defaultLimit
	}

	minuteSlot := time.Now().Unix() / 60
	redisKey := fmt.Sprintf("rl:%s:%d", keyID, minuteSlot)

	pipe := l.rdb.Pipeline()
	incr := pipe.Incr(ctx, redisKey)
	pipe.Expire(ctx, redisKey, 120*time.Second)
	if _, err := pipe.Exec(ctx); err != nil {
		// Fail open: allow request if Redis is unavailable.
		return true, limit, err
	}

	count := int(incr.Val())
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}
	return count <= limit, remaining, nil
}
