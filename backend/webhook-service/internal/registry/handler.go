package registry

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"webhook-service/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/", h.create)
	r.Get("/", h.list)
	r.Get("/{id}", h.get)
	r.Patch("/{id}", h.update)
	r.Delete("/{id}", h.delete)
	return r
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		respondErr(w, http.StatusForbidden, "organization required")
		return
	}

	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if input.URL == "" || input.Secret == "" {
		respondErr(w, http.StatusUnprocessableEntity, "url and secret are required")
		return
	}

	webhook, err := h.repo.Create(r.Context(), claims.OrganizationID, input)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "create failed")
		return
	}
	respond(w, http.StatusCreated, webhook)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		respondErr(w, http.StatusForbidden, "organization required")
		return
	}

	webhooks, err := h.repo.List(r.Context(), claims.OrganizationID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "list failed")
		return
	}
	if webhooks == nil {
		webhooks = []Webhook{}
	}
	respond(w, http.StatusOK, webhooks)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		respondErr(w, http.StatusForbidden, "organization required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondErr(w, http.StatusBadRequest, "invalid id")
		return
	}

	webhook, err := h.repo.FindByID(r.Context(), id, claims.OrganizationID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if webhook == nil {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	respond(w, http.StatusOK, webhook)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		respondErr(w, http.StatusForbidden, "organization required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondErr(w, http.StatusBadRequest, "invalid id")
		return
	}

	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	webhook, err := h.repo.Update(r.Context(), id, claims.OrganizationID, input)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "update failed")
		return
	}
	if webhook == nil {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	respond(w, http.StatusOK, webhook)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.OrganizationID == "" {
		respondErr(w, http.StatusForbidden, "organization required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondErr(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.repo.Delete(r.Context(), id, claims.OrganizationID); err != nil {
		respondErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondErr(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"message": msg})
}
