package validate

import (
	"log/slog"
	"net/http"
	"strings"

	"api-key-service/internal/jwt"
	"api-key-service/internal/keystore"
	"api-key-service/internal/quota"
	"api-key-service/internal/ratelimit"
)

type Handler struct {
	store   *keystore.Store
	limiter *ratelimit.Limiter
	quota   *quota.Tracker
	signer  *jwt.Signer
	defaultRateLimit int
}

func NewHandler(
	store *keystore.Store,
	limiter *ratelimit.Limiter,
	tracker *quota.Tracker,
	signer *jwt.Signer,
	defaultRateLimit int,
) *Handler {
	return &Handler{
		store:            store,
		limiter:          limiter,
		quota:            tracker,
		signer:           signer,
		defaultRateLimit: defaultRateLimit,
	}
}

// ServeHTTP handles GET /internal/validate
// Called by Kong's pre-function on every API-key-bearing request.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rawKey := extractKey(r)
	if rawKey == "" {
		http.Error(w, `{"message":"missing api key"}`, http.StatusUnauthorized)
		return
	}

	info, err := h.store.Validate(r.Context(), rawKey)
	if err != nil {
		slog.Error("key validation", "err", err)
		http.Error(w, `{"message":"internal error"}`, http.StatusInternalServerError)
		return
	}
	if info == nil {
		http.Error(w, `{"message":"invalid api key"}`, http.StatusUnauthorized)
		return
	}

	// Rate limit check.
	allowed, remaining, _ := h.limiter.Allow(r.Context(), info.ID, h.defaultRateLimit)
	w.Header().Set("X-RateLimit-Remaining", http.StatusText(remaining))
	if !allowed {
		http.Error(w, `{"message":"rate limit exceeded"}`, http.StatusTooManyRequests)
		return
	}

	// Soft quota check — log but don't block (quota enforcement is informational).
	exceeded, _ := h.quota.IsExceeded(r.Context(), info.OrganizationID)
	if exceeded {
		slog.Warn("quota exceeded", "org", info.OrganizationID)
		w.Header().Set("X-Quota-Exceeded", "true")
	}

	// Sign a short-lived JWT (30s) with the same RS256 key used by user-service.
	token, err := h.signer.Sign(info.ID, info.OrganizationID, info.OrgSlug, info.Role)
	if err != nil {
		slog.Error("jwt signing", "err", err)
		http.Error(w, `{"message":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("X-Validated-Token", token)
	w.WriteHeader(http.StatusOK)
}

func extractKey(r *http.Request) string {
	if k := r.Header.Get("X-Api-Key"); k != "" {
		return k
	}
	if auth := r.Header.Get("Authorization"); auth != "" {
		if after, ok := strings.CutPrefix(auth, "Bearer "); ok {
			return after
		}
	}
	return ""
}
