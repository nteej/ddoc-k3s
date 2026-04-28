package quota

import (
	"context"
	"encoding/json"
	"log/slog"

	kafka "github.com/segmentio/kafka-go"
)

type documentEvent struct {
	Event          string `json:"event"`
	OrganizationID string `json:"organizationId"`
}

type Consumer struct {
	reader  *kafka.Reader
	tracker *Tracker
}

func NewConsumer(brokers []string, tracker *Tracker) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: brokers,
			GroupID: "api-key-service-quota",
			Topic:   "webhook.dispatch",
			MaxBytes: 10e6,
		}),
		tracker: tracker,
	}
}

func (c *Consumer) Run(ctx context.Context) {
	defer c.reader.Close()
	slog.Info("quota consumer started (webhook.dispatch)")
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("quota consumer read", "err", err)
			continue
		}

		var ev documentEvent
		if err := json.Unmarshal(msg.Value, &ev); err != nil {
			continue
		}
		if ev.Event == "document.generated" && ev.OrganizationID != "" {
			c.tracker.Increment(ctx, ev.OrganizationID)
		}
	}
}
