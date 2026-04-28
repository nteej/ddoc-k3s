-- Per-org monthly document-generation usage
CREATE TABLE IF NOT EXISTS monthly_usage (
    organization_id TEXT    NOT NULL,
    month           TEXT    NOT NULL,  -- YYYY-MM
    docs_generated  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, month)
);

-- Optional per-org quota overrides (defaults come from env)
CREATE TABLE IF NOT EXISTS organization_quotas (
    organization_id TEXT    PRIMARY KEY,
    monthly_limit   INTEGER NOT NULL
);
