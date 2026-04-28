package consumer

import (
	"context"
	"encoding/json"
	"log/slog"

	kafka "github.com/segmentio/kafka-go"
	"webhook-service/internal/sse"
)

type NotificationConsumer struct {
	reader *kafka.Reader
	hub    *sse.Hub
}

func NewNotificationConsumer(brokers []string, hub *sse.Hub) *NotificationConsumer {
	return &NotificationConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  brokers,
			GroupID:  "webhook-service-notifications",
			Topic:    "notification.dispatch",
			MaxBytes: 10e6,
		}),
		hub: hub,
	}
}

func (c *NotificationConsumer) Run(ctx context.Context) {
	defer c.reader.Close()
	slog.Info("notification.dispatch consumer started")
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("read notification.dispatch", "err", err)
			continue
		}
		c.handle(msg.Value)
	}
}

func (c *NotificationConsumer) handle(raw []byte) {
	var msg NotificationDispatch
	if err := json.Unmarshal(raw, &msg); err != nil {
		slog.Error("unmarshal notification.dispatch", "err", err)
		return
	}
	if msg.UserID == "" {
		return
	}

	c.hub.Publish(msg.UserID, sse.Notification{
		Type:  msg.Type,
		Title: msg.Title,
		Body:  msg.Body,
		Data:  msg.Data,
	})
}
