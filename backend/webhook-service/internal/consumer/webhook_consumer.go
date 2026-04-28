package consumer

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	kafka "github.com/segmentio/kafka-go"
	"webhook-service/internal/delivery"
	"webhook-service/internal/registry"
)

type WebhookConsumer struct {
	reader   *kafka.Reader
	db       *pgxpool.Pool
	registry *registry.Repository
}

func NewWebhookConsumer(brokers []string, db *pgxpool.Pool, reg *registry.Repository) *WebhookConsumer {
	return &WebhookConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  brokers,
			GroupID:  "webhook-service-webhooks",
			Topic:    "webhook.dispatch",
			MaxBytes: 10e6,
		}),
		db:       db,
		registry: reg,
	}
}

func (c *WebhookConsumer) Run(ctx context.Context) {
	defer c.reader.Close()
	slog.Info("webhook.dispatch consumer started")
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("read webhook.dispatch", "err", err)
			continue
		}
		c.handle(ctx, msg.Value)
	}
}

func (c *WebhookConsumer) handle(ctx context.Context, raw []byte) {
	var msg WebhookDispatch
	if err := json.Unmarshal(raw, &msg); err != nil {
		slog.Error("unmarshal webhook.dispatch", "err", err)
		return
	}
	if msg.OrganizationID == "" || msg.Event == "" {
		return
	}

	webhooks, err := c.registry.FindActiveByOrg(ctx, msg.OrganizationID, msg.Event)
	if err != nil {
		slog.Error("find active webhooks", "org", msg.OrganizationID, "err", err)
		return
	}
	if len(webhooks) == 0 {
		return
	}

	targets := make([]delivery.WebhookTarget, len(webhooks))
	for i, wh := range webhooks {
		targets[i] = delivery.WebhookTarget{ID: wh.ID}
	}

	if err := delivery.Enqueue(ctx, c.db, targets, msg.Event, raw); err != nil {
		slog.Error("enqueue deliveries", "err", err)
	}
}
