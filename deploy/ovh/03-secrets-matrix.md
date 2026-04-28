# Step 3: Production Secrets And Registry Matrix

Replace every development placeholder before deploying to the OVH VPS.

## Registry inputs

| Variable | Example | Used by |
| --- | --- | --- |
| `REGISTRY` | `ghcr.io/acme/dynadoc` | `make push`, `make deploy`, rollout commands |
| `TAG` | `a1b2c3d` | image selection across all manifests |

## Kubernetes secret inputs

| Secret | Key | Current source | Production requirement |
| --- | --- | --- | --- |
| `user-app-secret` | `APP_KEY` | `k8s/secrets/app-secrets.yaml` | Generate a unique Laravel app key for user-service |
| `template-app-secret` | `APP_KEY` | `k8s/secrets/app-secrets.yaml` | Generate a unique Laravel app key for template-service |
| `file-app-secret` | `APP_KEY` | `k8s/secrets/app-secrets.yaml` | Generate a unique Laravel app key for file-service |
| `audit-app-secret` | `APP_KEY` | `k8s/secrets/app-secrets.yaml` | Generate a unique Laravel app key for audit-service |
| `user-db-secret` | `POSTGRES_PASSWORD` | `k8s/secrets/db-secrets.yaml` | Replace `postgres` with a strong password |
| `template-db-secret` | `POSTGRES_PASSWORD` | `k8s/secrets/db-secrets.yaml` | Replace `postgres` with a strong password |
| `file-db-secret` | `POSTGRES_PASSWORD` | `k8s/secrets/db-secrets.yaml` | Replace `postgres` with a strong password |
| `audit-db-secret` | `POSTGRES_PASSWORD` | `k8s/secrets/db-secrets.yaml` | Replace `postgres` with a strong password |
| `kong-db-secret` | `POSTGRES_PASSWORD` | `k8s/secrets/db-secrets.yaml` | Replace `kong` with a strong password |
| `kong-jwt-secret` | `jwt-public.pem` | `k8s/secrets/kong-jwt-secret.yaml` | Replace demo key with the production JWT public key |

## Service runtime matrix

| Workload | Required inputs | Notes |
| --- | --- | --- |
| `user-app` | `APP_KEY`, `DB_*`, OTEL endpoint | JWT auth endpoints are exposed through Kong |
| `template-app` | `APP_KEY`, `DB_*`, `REDIS_*`, `KAFKA_BROKERS`, `AWS_*`, OTEL endpoint | Uses LocalStack S3 endpoint in current repo shape |
| `template-consumer` | `APP_KEY`, `DB_*`, `KAFKA_BROKERS` | Kafka consumer |
| `template-queue` | `APP_KEY`, `DB_*`, `REDIS_*` | Redis queue worker |
| `file-app` | `APP_KEY`, `DB_*`, `REDIS_*`, `KAFKA_BROKERS`, `AWS_*`, `HOST_USER_SERVICE`, `HOST_TEMPLATE_SERVICE`, OTEL endpoint | Depends on user and template service URLs |
| `file-consumer` | `APP_KEY`, `DB_*`, `KAFKA_BROKERS`, `AWS_*` | Kafka consumer with S3 access |
| `file-queue` | `APP_KEY`, `DB_*`, `REDIS_*` | Redis queue worker |
| `audit-app` | `APP_KEY`, `DB_*`, `KAFKA_BROKERS`, OTEL endpoint | Audit ingestion service |
| `audit-consumer` | `APP_KEY`, `DB_*`, `KAFKA_BROKERS` | Kafka consumer |
| `kong` | `kong-db-secret`, `kong-jwt-secret` | Keep Kong Admin private |
| `localstack` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Repo defaults to `test/test`; keep as-is only if demo isolation is acceptable |

## Generation commands

Laravel app keys:

```bash
cd backend/user-service && php artisan key:generate --show
cd backend/template-service && php artisan key:generate --show
cd backend/file-service && php artisan key:generate --show
cd backend/audit-service && php artisan key:generate --show
```

Strong passwords:

```bash
openssl rand -base64 32
```

RSA keypair for Kong JWT:

```bash
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

## Mandatory production edits before `make deploy`

1. Replace all `APP_KEY` values in `k8s/secrets/app-secrets.yaml`.
2. Replace all database passwords in `k8s/secrets/db-secrets.yaml`.
3. Replace `k8s/secrets/kong-jwt-secret.yaml` with your production `jwt-public.pem`.
4. Confirm the Kong CORS origin is `https://ddoc.fi` in `deploy/ovh/k8s/kong-init-cm.ddoc.fi.yaml`.
5. Confirm your GHCR image path and tag are set in `REGISTRY` and `TAG`.