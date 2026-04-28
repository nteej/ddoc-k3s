package quota

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	kafka "github.com/segmentio/kafka-go"
)

type Usage struct {
	OrganizationID string `json:"organizationId"`
	Month          string `json:"month"`
	DocsGenerated  int    `json:"docsGenerated"`
	MonthlyLimit   int    `json:"monthlyLimit"`
}

type Tracker struct {
	ownDB        *pgxpool.Pool
	rdb          *redis.Client
	kafka        *kafka.Writer
	defaultQuota int
}

func NewTracker(ownDB *pgxpool.Pool, rdb *redis.Client, kafkaWriter *kafka.Writer, defaultQuota int) *Tracker {
	return &Tracker{ownDB: ownDB, rdb: rdb, kafka: kafkaWriter, defaultQuota: defaultQuota}
}

func (t *Tracker) Increment(ctx context.Context, orgID string) {
	month := time.Now().Format("2006-01")

	// Upsert monthly usage.
	_, err := t.ownDB.Exec(ctx, `
		INSERT INTO monthly_usage (organization_id, month, docs_generated)
		VALUES ($1, $2, 1)
		ON CONFLICT (organization_id, month)
		DO UPDATE SET docs_generated = monthly_usage.docs_generated + 1
	`, orgID, month)
	if err != nil {
		slog.Error("quota increment", "org", orgID, "err", err)
		return
	}

	// Check if quota just exceeded.
	usage, err := t.GetUsage(ctx, orgID, month)
	if err != nil {
		return
	}
	if usage.DocsGenerated >= usage.MonthlyLimit {
		t.publishQuotaExceeded(ctx, orgID, usage)
	}
}

func (t *Tracker) GetUsage(ctx context.Context, orgID, month string) (Usage, error) {
	if month == "" {
		month = time.Now().Format("2006-01")
	}

	limit := t.defaultQuota
	var override int
	err := t.ownDB.QueryRow(ctx,
		`SELECT monthly_limit FROM organization_quotas WHERE organization_id = $1`, orgID,
	).Scan(&override)
	if err == nil {
		limit = override
	}

	usage := Usage{OrganizationID: orgID, Month: month, MonthlyLimit: limit}
	t.ownDB.QueryRow(ctx,
		`SELECT docs_generated FROM monthly_usage WHERE organization_id=$1 AND month=$2`,
		orgID, month,
	).Scan(&usage.DocsGenerated)

	return usage, nil
}

func (t *Tracker) IsExceeded(ctx context.Context, orgID string) (bool, error) {
	month := time.Now().Format("2006-01")
	usage, err := t.GetUsage(ctx, orgID, month)
	if err != nil {
		return false, err
	}
	return usage.DocsGenerated >= usage.MonthlyLimit, nil
}

func (t *Tracker) publishQuotaExceeded(ctx context.Context, orgID string, usage Usage) {
	if t.kafka == nil {
		return
	}
	payload := fmt.Sprintf(
		`{"event":"quota.exceeded","organizationId":%q,"month":%q,"docsGenerated":%d,"monthlyLimit":%d,"timestamp":%q}`,
		orgID, usage.Month, usage.DocsGenerated, usage.MonthlyLimit, time.Now().UTC().Format(time.RFC3339),
	)
	err := t.kafka.WriteMessages(ctx, kafka.Message{Value: []byte(payload)})
	if err != nil {
		slog.Error("publish quota.exceeded", "org", orgID, "err", err)
	}
}
