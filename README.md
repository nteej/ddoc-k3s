# DynaDoc

**Open-source platform for generating PDF documents from HTML templates with dynamic data tags.**

Live at **[ddoc.fi](https://ddoc.fi)** · v2.0.2

DynaDoc solves a common problem in document-heavy workflows: generating personalized PDFs at scale — contracts, invoices, reports, certificates — without hard-coding templates into application code or editing each file manually. Admins build reusable templates through a rich web editor; external systems inject data via a simple REST API to trigger async generation.

---

## Table of Contents

- [What's New in v2.0](#whats-new-in-v20)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Services](#services)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Observability](#observability)
- [Roadmap](#roadmap)

---

## What's New in v2.0

**v2.0.0** ships Enterprise SSO as a first-class feature:

- **OAuth2 Authorization Code Grant** via Laravel Passport — organizations authenticate through a centralized DynaDoc auth server and receive a short-lived JWT with organization and role context
- **Token introspection endpoint** (`POST /api/oauth/introspect`) — downstream services validate Passport Bearer tokens and receive enriched claims without decoding JWTs themselves
- **Auto-consent** — first-party OAuth2 clients are approved automatically, no manual consent click needed
- **Token revocation on logout** — the Passport token is revoked server-side via the `passport_jti` claim embedded in the session JWT
- **SSO Integration Guide** — admin-only documentation page at `/sso-integration` covering the full middleware pattern, Kong routing, environment variables, testing, and security checklist

---

## Features

### Template Management
- Create, edit, and delete document templates through a web interface
- Templates are composed of ordered **sections** — modular HTML blocks that can be reused and reordered by drag-and-drop
- Full rich-text editor per section with formatting controls: bold, italic, underline, alignment, lists, tables, images, links, code blocks, and more
- Import a section from another template
- Search templates by name with paginated results

### Dynamic Tags & Contexts
- Define **tags** (dynamic placeholders) that are replaced with real data at generation time
- Tag types: **Text**, **Number**, **Date**, **Select**, **Email**, **Long Text**
- Tags are grouped into **Contexts** for organization (e.g. a "Client" context with `client_name`, `client_address`)
- The section editor autocompletes available tags while writing content

### Async PDF Generation
- Submit a JSON payload via REST API — a PDF is generated asynchronously in the background
- Generation flow: `file-service` queues on Kafka → `template-service` renders HTML + replaces tags → `file-service` renders PDF via Dompdf → stores result in S3 → file status becomes `READY`
- Track generation status and download completed files from the Files page
- Files page polls every 4 seconds while any file is in `PROCESSING` state; polling stops automatically when all reach a final state

### Batch PDF Generation
- Upload an Excel spreadsheet (`.xlsx` / `.xls`) — generates one PDF per row across any template in a single operation
- Each row maps to a separate document with its own field values

### Enterprise SSO (v2.0)
- OAuth2 Authorization Code Grant flow via Laravel Passport
- Auto-consent for first-party clients — login and redirect in a single seamless flow
- Downstream services validate tokens via introspection; they receive enriched claims (`userId`, `organizationId`, `role`, `isSystemAdmin`) without needing to decode JWTs themselves
- Token revocation propagates to all downstream services on logout
- SSO Integration Guide at `/sso-integration` (admin-only)

### Organization & Role Management
- Users belong to **organizations** — all document data is scoped per organization
- Roles: `viewer`, `editor`, `admin`, `owner` with hierarchical access control
- Organization admins manage members, roles, and organization settings
- Invite new members via email invitation links

### API Key Management
- Generate and manage API keys for programmatic document generation
- Full CRUD from the API Keys page — no session-based auth required for key consumers
- Keys are scoped per organization

### Webhook Management
- Register webhooks to receive real-time events when documents reach `READY` or `ERROR` state
- Full CRUD from the Webhooks page

### Notifications
- Event-driven email notifications powered by Kafka
- `notification-service` consumes `notification.send` events and dispatches via SMTP

### Audit Logging
- `audit-service` records key actions across the platform for compliance and debugging

### Multi-language UI
- Full interface in **English**, **Finnish** (Suomi), and **Swedish** (Svenska)
- Language preference is detected from the browser and saved automatically

---

## Architecture

```
                        ┌──────────────────────┐
                        │   Browser / Client    │
                        │      ddoc.fi          │
                        └──────────┬───────────┘
                                   │ HTTPS
                                   ▼
                        ┌──────────────────────┐
                        │   nginx Ingress       │
                        │   (TLS termination)   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Kong API Gateway    │
                        │   JWT plugin (RS256)  │
                        │   Rate limiting       │
                        └──┬──┬──┬──┬──┬───┬───┘
                           │  │  │  │  │   │
            ┌──────────────┘  │  │  │  │   └───────────────┐
            ▼                 ▼  │  ▼  ▼                   ▼
      user-service      template │  file-service      api-key-service
      Auth, JWT,        -service │  Files, S3,        API key CRUD
      OAuth2/Passport   PDF      │  Dompdf            & validation
                        render   │
                                 ├──► audit-service
                                 │    Audit logging
                                 │
                                 ├──► notification-service
                                 │    Email dispatch (Kafka-driven)
                                 │
                                 └──► webhook-service
                                      Outbound webhook delivery

Each service has its own PostgreSQL database.

                   ┌────────────────────────────┐
                   │        Apache Kafka         │
                   │  template.requested         │
                   │  template.delivered         │
                   │  notification.send          │
                   └────────────────────────────┘

                   ┌────────────────────────────┐
                   │      LocalStack S3          │
                   │  Generated PDF storage      │
                   └────────────────────────────┘

                   ┌────────────────────────────┐
                   │   Observability namespace   │
                   │  Prometheus · Grafana       │
                   │  Tempo (OTLP traces)        │
                   │  Loki · Promtail            │
                   └────────────────────────────┘
```

### Async PDF Generation Flow

```
Client
  │  POST /api/files/async-generate
  ▼
file-service ──► Kafka [template.requested]
                        │
                 template-consumer (Laravel queue worker)
                        │
                 template-service
                 Renders HTML, replaces #TAG# placeholders
                 Dompdf → PDF bytes
                        │
                 Kafka [template.delivered]
                        │
                 file-consumer (Laravel queue worker)
                        │
                 file-service
                 Stores PDF in LocalStack S3
                 Updates file status → READY
                        │
               GET /api/files/download/:id
```

### SSO Authorization Code Flow

```
Browser                 Kong            user-service (Passport)
  │                      │                     │
  │  GET /api/auth/sso-link                    │
  │─────────────────────►│────────────────────►│
  │◄────────────────────────────────────────── │ { url, state, signed_state }
  │                                            │
  │  Redirect browser to /oauth/authorize      │
  │───────────────────────────────────────────►│
  │◄────────────────────────────────────────── │ 302 → /auth/callback?code=…
  │                                            │
  │  POST /api/auth/sso-exchange { code, state, signed_state }
  │─────────────────────►│────────────────────►│
  │                                            │  verify HMAC state
  │                                            │  POST /oauth/token (Passport)
  │                                            │  load user + org context
  │◄────────────────────────────────────────── │ Set-Cookie: token=<JWT>
```

---

## Tech Stack

### Backend — 7 PHP 8.4 / Laravel 12 Microservices

| Service | Responsibility |
|---------|----------------|
| `user-service` | Auth (password + SSO), JWT issuance, OAuth2/Passport server, token introspection, organization management |
| `template-service` | Templates, Sections, Tags, Contexts — PDF rendering via Dompdf |
| `file-service` | File records, Dompdf PDF generation, LocalStack S3 storage, email delivery |
| `audit-service` | Audit log ingestion and query |
| `notification-service` | Email dispatch — consumes `notification.send` Kafka events |
| `api-key-service` | API key issuance, CRUD, and validation |
| `webhook-service` | Outbound webhook registration and delivery |

All services follow **Domain-Driven Design** with Clean Architecture layers:
- `Domain/` — Entities, repository interfaces, enums, domain exceptions
- `Application/` — DTOs, handlers (use cases), events, listeners, services
- `Infrastructure/` — Laravel controllers, repositories, Kafka producers/consumers, HTTP middleware

Key shared libraries: `laravel/framework ^12.0`, `firebase/php-jwt ^6.11`, `mateusjunges/laravel-kafka`, `open-telemetry/sdk`

`user-service` additionally uses `laravel/passport ^12.0` for the OAuth2 server.

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tool |
| React Router v6 | Client-side routing |
| TanStack Query | Server state and caching |
| shadcn/ui + Radix UI | Component library |
| Tailwind CSS 3 | Styling |
| React Hook Form + Zod | Form handling and validation |
| i18next | Internationalisation (EN / FI / SV) |
| Lucide React | Icons |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Orchestration | Kubernetes (k3s on VPS) | Runs all workloads in the `dynadoc` namespace |
| API Gateway | Kong 3.6 | Centralized routing, JWT validation, rate limiting |
| Message Broker | Apache Kafka (Confluent 7.6) | Async PDF generation and notification pipeline |
| Coordination | Zookeeper | Kafka broker coordination |
| Database | PostgreSQL 15 | One database per service |
| File Storage | LocalStack S3 | Generated PDF storage |
| Container Registry | GHCR (`ghcr.io/nteej/dynadoc/*`) | Docker image storage |
| IaC | Kustomize | Base manifests + production overlay with pinned image tags |
| Ingress | nginx-ingress | TLS termination, routes to Kong |
| Observability | Prometheus, Grafana, Tempo, Loki, Promtail | Metrics, dashboards, distributed traces, logs |
| Tracing | OpenTelemetry (OTLP → Tempo) | Per-request traces across all PHP services |

---

## Services

### Authentication flows

**Password login**
```
POST /api/auth/login   →   user-service issues RS256 JWT   →   HttpOnly cookie
```

**Enterprise SSO**
```
GET  /api/auth/sso-link           →  Passport authorize URL + HMAC state
GET  /oauth/authorize             →  Passport consent (auto-approved for 1st-party)
GET  /auth/callback?code=…        →  frontend receives code
POST /api/auth/sso-exchange       →  code + state exchanged for JWT cookie
```

**Token introspection** (internal, service-to-service only)
```
POST /api/oauth/introspect
Authorization: Bearer <passport-token>
X-Introspect-Secret: <shared-secret>

→  { active, userId, organizationId, role, isSystemAdmin, exp, … }
```

### Service-to-service authentication

Every downstream service (template, file, audit, …) runs `ExtractJwtClaimsMiddleware`:

1. If the token is a DynaDoc JWT (`iss = "user-service"`) — decode the payload directly. Kong already validated the RSA signature at the gateway; no network call is needed.
2. If the token is a Passport Bearer token — call `/api/oauth/introspect` with the `X-Introspect-Secret` header to retrieve enriched user claims.

See the admin-only **SSO Integration Guide** at `/sso-integration` for the full middleware source, Kong registration steps, environment variables, and security checklist.

---

## API Reference

All external requests go through Kong at `https://ddoc.fi` (or `http://<kong-svc>:8000` inside the cluster). Protected routes require the `token` cookie set by the login endpoint, or an `Authorization: Bearer <passport-token>` header.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account; sets `token` cookie |
| `POST` | `/api/auth/login` | Password login; sets `token` cookie |
| `GET`  | `/api/auth/me` | Return current user (restores session on page load) |
| `POST` | `/api/auth/logout` | Clear cookie + revoke Passport token if present |
| `GET`  | `/api/auth/sso-link` | Return Passport authorize URL and HMAC state |
| `POST` | `/api/auth/sso-exchange` | Exchange authorization code for JWT cookie |
| `POST` | `/api/oauth/introspect` | Introspect Passport token (internal, `X-Introspect-Secret` required) |
| `GET`  | `/api/auth/sso/{provider}` | Start Socialite SSO (Google, GitHub) |
| `GET`  | `/api/auth/sso/{provider}/callback` | Socialite OAuth callback |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/templates/filters` | List templates (`?name=`, `?page=`, `?limit=`) |
| `POST` | `/api/templates` | Create a template |
| `PATCH`| `/api/templates/:id` | Update a template |
| `DELETE`| `/api/templates/:id` | Delete template and its sections |

### Sections

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/sections/filters` | List sections (`?templateId=`) |
| `POST` | `/api/sections` | Create a section |
| `PATCH`| `/api/sections/:id` | Update content or order |
| `DELETE`| `/api/sections/:id` | Delete a section |

### Tags & Contexts

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/contexts/filters` | List contexts |
| `POST` | `/api/contexts` | Create a context |
| `PATCH`| `/api/contexts/:id` | Update a context |
| `DELETE`| `/api/contexts/:id` | Delete a context |
| `GET`  | `/api/tags/filters` | List tags (`?name=`, `?contextId=`) |
| `POST` | `/api/tags` | Create a tag |
| `PATCH`| `/api/tags/:id` | Update a tag |
| `DELETE`| `/api/tags/:id` | Delete a tag |

### File Generation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files/async-generate` | Queue a PDF generation job |
| `GET`  | `/api/files/filters` | List generated files |
| `GET`  | `/api/files/download/:id` | Download a generated PDF |
| `DELETE`| `/api/files/:id` | Delete a file record |

#### async-generate payload

```json
{
  "templateId": "uuid-of-template",
  "name": "output-filename",
  "payload": {
    "#CLIENT_NAME#": "Jane Smith",
    "#CONTRACT_DATE#": "2025-01-01"
  }
}
```

Payload keys **must** use the `#TAG_NAME#` delimiter format. Keys without delimiters return a 422 validation error.

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/api-keys` | List API keys for the current organization |
| `POST` | `/api/api-keys` | Create a new API key |
| `DELETE`| `/api/api-keys/:id` | Revoke an API key |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Register a webhook |
| `PATCH`| `/api/webhooks/:id` | Update a webhook |
| `DELETE`| `/api/webhooks/:id` | Delete a webhook |

---

## Project Structure

```
dynadoc-flow/
├── backend/
│   ├── user-service/               # Auth, JWT, OAuth2/Passport, organization management
│   │   ├── app/
│   │   │   ├── Application/        # Handlers, DTOs, Events, Services, JwtService
│   │   │   ├── Domain/             # User/Org entities, repository interfaces
│   │   │   └── Infrastructure/     # Controllers (Auth, OAuth, Org), Passport, middleware
│   │   └── entrypoint.sh           # migrate → passport:keys → php-fpm
│   │
│   ├── template-service/           # Templates, Sections, Tags, Contexts, PDF rendering
│   │   ├── app/
│   │   │   ├── Application/        # Handlers (CRUD + PDF delivery)
│   │   │   ├── Domain/             # 4 entities, TagTypeEnum, repository interfaces
│   │   │   └── Infrastructure/     # Controllers, Kafka consumer/producer, JWT middleware
│   │   ├── consumer-entrypoint.sh  # kafka:consume-template-requested
│   │   └── queue-entrypoint.sh     # queue:work (Kafka producer jobs)
│   │
│   ├── file-service/               # File records, Dompdf PDF generation, S3 storage
│   │   ├── app/
│   │   │   ├── Application/        # FileGenerationHandler, download, destroy
│   │   │   ├── Domain/             # File entity, FileStatusEnum (PROCESSING/READY/ERROR)
│   │   │   └── Infrastructure/     # FileController, Kafka consumer, S3, email (Dompdf)
│   │   ├── consumer-entrypoint.sh  # kafka:consume-template-delivered
│   │   └── queue-entrypoint.sh     # queue:work
│   │
│   ├── audit-service/              # Audit log ingestion
│   ├── notification-service/       # Email dispatch — consumes notification.send
│   ├── api-key-service/            # API key issuance and validation
│   └── webhook-service/            # Outbound webhook delivery
│
├── frontend/                       # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx         # Public landing page (v2.0 release banner + SSO section)
│       │   ├── SsoIntegrationPage.tsx  # Admin-only SSO integration guide
│       │   ├── ArchitecturePage.tsx    # System architecture visualization
│       │   ├── InfrastructurePage.tsx  # Infrastructure overview
│       │   └── OrganizationPage.tsx    # Organization & member management
│       ├── components/
│       │   ├── LoginPage.tsx / SignupPage.tsx
│       │   ├── DocumentsPage.tsx       # Template & section management
│       │   ├── GeneratePage.tsx        # Interactive PDF generation form
│       │   ├── FilesPage.tsx           # File list with auto-polling status
│       │   ├── BatchPage.tsx           # Bulk generation via Excel upload
│       │   ├── ApiPage.tsx             # API reference with dynamic payload builder
│       │   ├── ApiKeysPage.tsx         # API key management
│       │   ├── WebhooksPage.tsx        # Webhook management
│       │   └── Header.tsx              # Sticky nav with role-guarded admin links
│       ├── components/ui/          # shadcn/ui components
│       ├── contexts/AuthContext.tsx
│       ├── components/RoleGuard.tsx    # Hierarchy-based role gate (viewer→editor→admin→owner)
│       └── i18n/locales/           # en.json, fi.json, sv.json
│
├── k8s/
│   ├── apps/                       # One directory per service (Deployment + Service + DB)
│   │   ├── user/, template/, file/, audit/
│   │   ├── notification/, api-key/, webhook/
│   │   └── swagger/                # Swagger UI deployment
│   ├── infra/                      # Kong, Kafka, Zookeeper, Redis, LocalStack, Ingress
│   ├── observability/              # Prometheus, Grafana, Tempo, Loki, Promtail
│   ├── secrets/                    # Secret YAML templates (gitignored values)
│   ├── configmaps/                 # nginx configs, Kong init, Kafka init
│   └── namespaces/
│
├── overlays/
│   └── production/
│       └── kustomization.yaml      # Image substitution (REGISTRY/* → ghcr.io/nteej/dynadoc/*)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # PR gating: PHP tests + TS type-check per changed service
│   │   ├── cd.yml                  # Build + push to GHCR + rolling deploy via SSH
│   │   └── release.yml             # Creates GitHub releases
│   └── CODEOWNERS
│
├── Makefile                        # push-service, rollout-*, overlay-tag helpers
└── CHANGELOG.md
```

---

## Deployment

DynaDoc runs on a single VPS managed with Kubernetes. All workloads live in the `dynadoc` namespace.

### Prerequisites

| Tool | Version |
|------|---------|
| kubectl | 1.29+ |
| kustomize | 5.x |
| gh CLI | 2.x (for CD workflow triggers) |
| GHCR write access | — |

### Applying manifests

```bash
# Render the production overlay and apply
kubectl kustomize overlays/production | kubectl apply -f -

# Or apply all base manifests (uses REGISTRY placeholder — for cluster-local dev)
kubectl apply -k k8s/
```

### Building and deploying a single service

```bash
# Trigger the CD workflow for one service
gh workflow run cd.yml --field service=user --field tag=v2.1.0

# Or build locally with buildah and roll out
buildah build -t ghcr.io/nteej/dynadoc/user-service:v2.1.0 backend/user-service
buildah push ghcr.io/nteej/dynadoc/user-service:v2.1.0
OWNER=nteej TAG=v2.1.0 make rollout-user
```

### Secrets

Secrets are applied manually and live outside of git. Required secrets in the `dynadoc` namespace:

| Secret name | Keys | Used by |
|-------------|------|---------|
| `user-app-secret` | `APP_KEY`, `MAIL_PASSWORD` | user-service |
| `user-db-secret` | `POSTGRES_PASSWORD` | user-service, user-db |
| `introspect-secret` | `INTROSPECT_SECRET` | all services |
| `kong-jwt-secret` | `jwt-public.pem` | Kong JWT plugin, all services |
| `jwt-private-secret` | `jwt-private.pem` | user-service |
| `passport-secret` | `PASSPORT_CLIENT_ID`, `PASSPORT_CLIENT_SECRET` | user-service |
| `sso-secret` | `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | user-service |

### Running database migrations

```bash
kubectl exec -n dynadoc deployment/user-app     -c php-fpm -- php artisan migrate --force
kubectl exec -n dynadoc deployment/template-app -c php-fpm -- php artisan migrate --force
kubectl exec -n dynadoc deployment/file-app     -c php-fpm -- php artisan migrate --force
kubectl exec -n dynadoc deployment/audit-app    -c php-fpm -- php artisan migrate --force
```

### Seeding the Passport OAuth2 client

```bash
kubectl exec -n dynadoc deployment/user-app -c php-fpm -- php artisan db:seed --class=PassportClientSeeder
```

If `PASSPORT_CLIENT_ID` / `PASSPORT_CLIENT_SECRET` are set in the pod environment, the seeder is idempotent and re-creates the same client on each run.

---

## CI/CD Pipeline

### CI (`.github/workflows/ci.yml`)

Runs on every pull request. Each service test job is **skipped unless files in that service's directory changed** — so a frontend-only PR does not run PHP tests.

| Job | What it does |
|-----|-------------|
| `test-user-service` | PHP 8.4, PostgreSQL 15, `php artisan test` |
| `test-template-service` | PHP 8.4, PostgreSQL 15, `php artisan test` |
| `test-file-service` | PHP 8.4, PostgreSQL 15, `php artisan test` |
| `test-frontend` | `npm run build` (TypeScript type-check + Vite bundle) |

### CD (`.github/workflows/cd.yml`)

Triggered by a published GitHub release or `workflow_dispatch` with `service` and `tag` inputs.

1. **Build** — `docker/build-push-action` builds the service image and pushes to GHCR with the release tag and `:latest`
2. **Validate** — renders the production kustomize overlay to catch manifest errors before deploy
3. **Deploy** — SSHes to the VPS and runs `kubectl set image` + `kubectl rollout status` with automatic rollback on failure

To deploy a single service without a full release:

```bash
gh workflow run cd.yml --field service=user --field tag=v2.1.0
```

---

## Observability

All PHP services export traces via OpenTelemetry OTLP to **Grafana Tempo** (`http://tempo-svc.observability.svc.cluster.local:4318`). The `open-telemetry/opentelemetry-auto-laravel` package instruments Laravel automatically — no manual span creation needed for standard HTTP and DB calls.

| Tool | URL | Purpose |
|------|-----|---------|
| Grafana | [grafana.ddoc.fi](https://grafana.ddoc.fi) | Dashboards, trace explorer, log viewer |
| Prometheus | internal | Metrics scraping (Kafka exporter, kube-state-metrics, cAdvisor, node-exporter) |
| Tempo | internal OTLP | Distributed traces |
| Loki + Promtail | internal | Log aggregation from all pods |

Admin users can access Grafana from the **Monitoring** dropdown in the app header.

---

## Roadmap

- [x] Async PDF generation via Kafka pipeline
- [x] Kafka consumers and queue workers auto-start with restart policy
- [x] User self-registration
- [x] Interactive Generate Document page (no API client needed)
- [x] Real-time file status auto-polling
- [x] Full API reference documentation page with dynamic payload builder
- [x] Batch generation via Excel spreadsheet upload
- [x] Import section from another template
- [x] Migrate database from MySQL to PostgreSQL
- [x] Kubernetes deployment with Kustomize overlays
- [x] GitHub Actions CI/CD pipeline
- [x] OpenTelemetry distributed tracing
- [x] Organization management and role-based access control
- [x] API key management
- [x] Webhook management
- [x] Email notifications via Kafka
- [x] Enterprise SSO — OAuth2 Authorization Code Grant (Laravel Passport)
- [x] Token introspection endpoint for downstream services
- [x] Admin SSO Integration Guide (`/sso-integration`)
- [ ] Webhook delivery retry with exponential backoff
- [ ] Per-organization SSO identity provider configuration (custom OIDC/SAML)
- [ ] Template versioning and diff view
- [ ] PDF generation preview before queuing
- [ ] S3-compatible external storage backend (replace LocalStack with production S3/MinIO)

---

## Contributing

Pull requests are welcome. For larger changes, open an issue first to discuss the approach.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit following the existing style (`feat:`, `fix:`, `docs:`, etc.)
4. Make sure all tests pass:
   ```bash
   kubectl exec -n dynadoc deployment/user-app     -c php-fpm -- php artisan test --no-coverage
   kubectl exec -n dynadoc deployment/template-app -c php-fpm -- php artisan test --no-coverage
   kubectl exec -n dynadoc deployment/file-app     -c php-fpm -- php artisan test --no-coverage
   ```
5. Open a pull request against `master`

---

## License

[MIT](./LICENSE)
