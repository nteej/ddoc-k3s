package usage

import (
	"encoding/json"
	"net/http"
	"time"

	"api-key-service/internal/middleware"
	"api-key-service/internal/quota"
)

type Handler struct {
	tracker *quota.Tracker
}

func NewHandler(tracker *quota.Tracker) *Handler {
	return &Handler{tracker: tracker}
}

// ServeHTTP handles GET /api/usage
// Returns current-month document usage for the authenticated org.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		http.Error(w, `{"message":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}

	usage, err := h.tracker.GetUsage(r.Context(), claims.OrganizationID, month)
	if err != nil {
		http.Error(w, `{"message":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(usage)
}
