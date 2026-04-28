package delivery

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxBackoff = time.Hour

type WebhookTarget struct {
	ID uuid.UUID
}

type Worker struct {
	db         *pgxpool.Pool
	client     *http.Client
	maxRetries int
	workers    int
}

func New(db *pgxpool.Pool, maxRetries, workers int) *Worker {
	return &Worker{
		db:         db,
		client:     &http.Client{Timeout: 15 * time.Second},
		maxRetries: maxRetries,
		workers:    workers,
	}
}

func (w *Worker) Run(ctx context.Context) {
	// Reset any stuck deliveries from a prior crash.
	_, _ = w.db.Exec(ctx, `
		UPDATE webhook_deliveries SET status='pending', updated_at=NOW()
		WHERE status='processing'
	`)

	for i := 0; i < w.workers; i++ {
		go w.loop(ctx)
	}
}

func (w *Worker) loop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.processOnce(ctx)
		}
	}
}

type pendingRow struct {
	id           uuid.UUID
	webhookID    uuid.UUID
	event        string
	payload      json.RawMessage
	attemptCount int
	url          string
	secret       string
}

func (w *Worker) processOnce(ctx context.Context) {
	// Claim up to 5 deliveries atomically using SKIP LOCKED to avoid worker contention.
	rows, err := w.db.Query(ctx, `
		WITH claimed AS (
			SELECT d.id
			FROM webhook_deliveries d
			WHERE d.status IN ('pending', 'failed')
			  AND d.next_retry_at <= NOW()
			ORDER BY d.next_retry_at
			LIMIT 5
			FOR UPDATE SKIP LOCKED
		)
		UPDATE webhook_deliveries d
		SET status = 'processing', updated_at = NOW()
		FROM claimed, webhooks wh
		WHERE d.id = claimed.id AND wh.id = d.webhook_id
		RETURNING d.id, d.webhook_id, d.event, d.payload,
		          d.attempt_count, wh.url, wh.secret
	`)
	if err != nil {
		slog.Error("delivery poll", "err", err)
		return
	}
	defer rows.Close()

	var pending []pendingRow
	for rows.Next() {
		var r pendingRow
		var payloadBytes []byte
		if err := rows.Scan(
			&r.id, &r.webhookID, &r.event, &payloadBytes,
			&r.attemptCount, &r.url, &r.secret,
		); err != nil {
			slog.Error("scan delivery row", "err", err)
			continue
		}
		r.payload = payloadBytes
		pending = append(pending, r)
	}
	rows.Close()

	for _, p := range pending {
		go w.deliver(ctx, p)
	}
}

func (w *Worker) deliver(ctx context.Context, p pendingRow) {
	statusCode, respBody, deliveryErr := w.post(p.url, p.secret, p.event, p.id, p.payload)
	p.attemptCount++

	var status string
	nextRetry := time.Now()

	switch {
	case deliveryErr == nil && statusCode >= 200 && statusCode < 300:
		status = "success"
	case p.attemptCount >= w.maxRetries:
		status = "exhausted"
		slog.Warn("webhook exhausted", "url", p.url, "attempts", p.attemptCount)
	default:
		status = "failed"
		nextRetry = time.Now().Add(backoff(p.attemptCount))
		slog.Warn("webhook delivery failed", "url", p.url, "attempt", p.attemptCount,
			"status_code", statusCode, "err", deliveryErr)
	}

	_, err := w.db.Exec(ctx, `
		UPDATE webhook_deliveries
		SET status=$1, attempt_count=$2, last_status_code=$3,
		    last_response=$4, next_retry_at=$5, updated_at=NOW()
		WHERE id=$6
	`, status, p.attemptCount, statusCode, truncate(respBody, 1000), nextRetry, p.id)
	if err != nil {
		slog.Error("update delivery status", "err", err)
	}
}

func (w *Worker) post(url, secret, event string, deliveryID uuid.UUID, payload json.RawMessage) (int, string, error) {
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return 0, "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-DynaDoc-Event", event)
	req.Header.Set("X-DynaDoc-Delivery", deliveryID.String())
	req.Header.Set("X-DynaDoc-Signature", sign(secret, payload))

	resp, err := w.client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	return resp.StatusCode, string(body), nil
}

// Enqueue creates pending delivery records for each target webhook.
func Enqueue(ctx context.Context, db *pgxpool.Pool, targets []WebhookTarget, event string, payload json.RawMessage) error {
	for _, t := range targets {
		_, err := db.Exec(ctx, `
			INSERT INTO webhook_deliveries (webhook_id, event, payload)
			VALUES ($1, $2, $3)
		`, t.ID, event, payload)
		if err != nil {
			return fmt.Errorf("enqueue for webhook %s: %w", t.ID, err)
		}
	}
	return nil
}

func sign(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func backoff(attempt int) time.Duration {
	d := time.Duration(math.Pow(2, float64(attempt))) * 10 * time.Second
	if d > maxBackoff {
		return maxBackoff
	}
	return d
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
