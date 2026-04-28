package registry

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, orgID string, input CreateInput) (*Webhook, error) {
	events := input.Events
	if len(events) == 0 {
		events = []string{"document.generated", "document.failed"}
	}

	var w Webhook
	err := r.db.QueryRow(ctx, `
		INSERT INTO webhooks (organization_id, url, secret, events)
		VALUES ($1, $2, $3, $4)
		RETURNING id, organization_id, url, secret, events, active, created_at, updated_at
	`, orgID, input.URL, input.Secret, events).Scan(
		&w.ID, &w.OrganizationID, &w.URL, &w.Secret, &w.Events,
		&w.Active, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert: %w", err)
	}
	return &w, nil
}

func (r *Repository) List(ctx context.Context, orgID string) ([]Webhook, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, url, secret, events, active, created_at, updated_at
		FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var webhooks []Webhook
	for rows.Next() {
		var w Webhook
		if err := rows.Scan(
			&w.ID, &w.OrganizationID, &w.URL, &w.Secret, &w.Events,
			&w.Active, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID, orgID string) (*Webhook, error) {
	var w Webhook
	err := r.db.QueryRow(ctx, `
		SELECT id, organization_id, url, secret, events, active, created_at, updated_at
		FROM webhooks WHERE id = $1 AND organization_id = $2
	`, id, orgID).Scan(
		&w.ID, &w.OrganizationID, &w.URL, &w.Secret, &w.Events,
		&w.Active, &w.CreatedAt, &w.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	return &w, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, orgID string, input UpdateInput) (*Webhook, error) {
	current, err := r.FindByID(ctx, id, orgID)
	if err != nil || current == nil {
		return nil, err
	}

	url := current.URL
	if input.URL != nil {
		url = *input.URL
	}
	secret := current.Secret
	if input.Secret != nil {
		secret = *input.Secret
	}
	events := current.Events
	if len(input.Events) > 0 {
		events = input.Events
	}
	active := current.Active
	if input.Active != nil {
		active = *input.Active
	}

	var w Webhook
	err = r.db.QueryRow(ctx, `
		UPDATE webhooks SET url=$1, secret=$2, events=$3, active=$4, updated_at=NOW()
		WHERE id=$5 AND organization_id=$6
		RETURNING id, organization_id, url, secret, events, active, created_at, updated_at
	`, url, secret, events, active, id, orgID).Scan(
		&w.ID, &w.OrganizationID, &w.URL, &w.Secret, &w.Events,
		&w.Active, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update: %w", err)
	}
	return &w, nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID, orgID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM webhooks WHERE id=$1 AND organization_id=$2`, id, orgID)
	return err
}

// FindActiveByOrg returns active webhooks for an org that subscribe to a given event.
func (r *Repository) FindActiveByOrg(ctx context.Context, orgID, event string) ([]Webhook, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, url, secret FROM webhooks
		WHERE organization_id=$1 AND active=true AND $2=ANY(events)
	`, orgID, event)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var webhooks []Webhook
	for rows.Next() {
		var w Webhook
		if err := rows.Scan(&w.ID, &w.URL, &w.Secret); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}
