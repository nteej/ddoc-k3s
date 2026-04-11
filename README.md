# DDocs

**Open-source platform for generating PDF documents from HTML templates with dynamic data tags.**

DDocs solves a common problem in document-heavy workflows: generating personalized PDFs at scale — contracts, invoices, reports, certificates — without hard-coding templates into application code or editing each file manually. Admins build reusable templates through a rich web editor; external systems inject data via a simple REST API to trigger async generation.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Port Reference](#port-reference)
- [Roadmap](#roadmap)

---

## Features

### Template Management
- Create, edit, and delete document templates through a web interface
- Templates are composed of ordered **sections** — modular HTML blocks that can be reused and reordered by drag-and-drop
- Full rich-text editor per section with formatting controls: bold, italic, underline, strikethrough, alignment, lists, tables, images, links, code blocks, and more
- Search templates by name with paginated results

### Dynamic Tags
- Define **tags** (dynamic placeholders) that get replaced with real data at generation time
- Three tag types: **Text**, **Number**, and **Date**
- Tags are grouped into **Contexts** for organization (e.g. a "Client" context with tags like `client_name`, `client_cpf`, `client_address`)
- The tag editor autocompletes available tags while writing section content

### Async PDF Generation
- Submit a JSON payload via REST API → a PDF is generated asynchronously in the background
- Generation flow: `file-service` queues the request on Kafka → `template-service` processes the template and produces the PDF → `file-service` stores the result in S3 → file becomes available for download
- **Batch generation**: upload an Excel spreadsheet (`.xlsx`/`.xls`) with one row per document — generates multiple PDFs in a single request
- Track generation status and download completed files from the Files page

### Generate Document Page
- Interactive form for generating PDFs directly from the web interface — no API client needed
- Select a template, fill in tag values, generate one or multiple documents in a single submission
- Supports batch generation: add multiple document records per submission, each with its own name and field values
- After submission, documents queue for async generation and appear in the Files page when ready

### API Integration Page
- Full API reference documentation with collapsible endpoint cards (method, auth indicator, request/response schema)
- Dynamic JSON model builder — shows the exact payload structure based on your registered tags, using the required `#TAG_NAME#` format
- One-click copy of the JSON model — ready to paste into your integration
- cURL and JavaScript fetch code examples for each endpoint

### Real-time File Status
- The Files page polls every 4 seconds while any file is in "Processing" state
- Status badges update automatically to Ready (green), Processing (yellow spinner), or Error (red) without a manual refresh
- Polling stops automatically once all visible files reach a final status

### Authentication & Multi-tenancy
- **User self-registration** — new users can create an account directly from the login page
- **Persistent sessions** — `GET /auth/me` re-validates the JWT cookie on page load, so sessions survive browser refreshes
- JWT authentication via RS256 key pair
- Token delivered as an HTTP-only cookie (not exposed to JavaScript)
- Kong API Gateway enforces JWT validation on all routes except login
- Each user belongs to a **company** — data is scoped per company

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                      │
│              http://localhost:5173  (React)              │
└────────────────────────┬────────────────────────────────┘
                         │ All API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Kong API Gateway  :8000                        │
│   JWT validation (RS256) on all routes except login     │
└──────┬──────────────────┬──────────────────┬────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
 user-service      template-service      file-service
    :8081               :8082               :8083
  (Laravel)           (Laravel)           (Laravel)
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
               ┌──────────┴──────────┐
               │                     │
            MySQL              Kafka Cluster
          (3 DBs)          (3 brokers + Zookeeper)
                                     │
                             LocalStack S3
                           (PDF file storage)
```

### Async PDF Generation Flow

```
Client
  │  POST /api/files/async-generate
  ▼
file-service ──► Redis queue ──► file-queue worker
                                        │
                                 Kafka producer
                                 [template.requested]
                                        │
                                 template-consumer
                                        │
                                 Redis queue ──► template-queue worker
                                                        │
                                                 template-service
                                                 Renders HTML + replaces tags
                                                 Generates PDF (Dompdf)
                                                        │
                                                 Kafka producer
                                                 [template.delivered]
                                                        │
                                                 file-consumer
                                                        │
                                                 file-service
                                                 Uploads PDF to S3
                                                 Updates file status → READY
                                                        │
                                              GET /api/files/download/:id
```

---

## Tech Stack

### Backend — 3 Laravel Microservices

| Service | Responsibility | Key Libraries |
|---------|---------------|---------------|
| `user-service` | Authentication, JWT issuance | `firebase/php-jwt`, `laravel/sanctum` |
| `template-service` | Templates, Sections, Tags, Contexts, PDF rendering | `wkhtmltopdf`, `mateusjunges/laravel-kafka` |
| `file-service` | File records, S3 storage, download | `aws/aws-sdk-php`, `mateusjunges/laravel-kafka` |

All three services follow **Domain-Driven Design** with Clean Architecture layers:
- `Domain/` — Entities, Repository interfaces, Enums, Domain exceptions
- `Application/` — DTOs, Handlers (use cases), Events, Listeners, Services
- `Infrastructure/` — Laravel controllers, repositories, Kafka producers/consumers, HTTP middleware

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| React Router v6 | Client-side routing |
| TanStack Query | Server state and caching |
| ShadCN UI + Radix UI | Component library |
| Tailwind CSS | Styling |
| React DnD | Drag-and-drop section ordering |
| React Hook Form + Zod | Form handling and validation |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Gateway | Kong 3.6 | Centralized routing + JWT plugin |
| Message Broker | Apache Kafka (3 brokers) | Async PDF generation pipeline |
| Coordination | Zookeeper | Kafka broker coordination |
| Database | MySQL 8 | Persistent storage (one DB per service) |
| Cache | Redis 7 | Laravel cache layer |
| File Storage | LocalStack S3 | AWS S3 emulation for local development |
| Kafka Consumers | Docker services | `template-consumer` + `file-consumer`, auto-start with `restart: unless-stopped` |
| Queue Workers | Docker services | `template-queue` + `file-queue` (`queue:work`), auto-start with `restart: unless-stopped` |
| Containerization | Docker + Docker Compose | 20-service full local environment |

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | 2.x |

No local PHP, Node.js, or Composer installation is required — everything runs in containers.

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/nteej/ddocs-k3s.git
cd ddocs-k3s
```

### 2. Copy environment files

```bash
cp backend/user-service/.env.example     backend/user-service/.env
cp backend/template-service/.env.example backend/template-service/.env
cp backend/file-service/.env.example     backend/file-service/.env
```

The default values are pre-configured for Docker Compose networking and work without changes for local development.

### 3. Start all containers

```bash
docker compose up -d
```

Wait ~30 seconds for Kong to pass its health check and register routes via `kong-init`.

### 4. Create databases and run migrations

```bash
# Create the three MySQL databases
docker exec mysql-db mysql -uroot -proot -e "
  CREATE DATABASE IF NOT EXISTS user_service;
  CREATE DATABASE IF NOT EXISTS template_service;
  CREATE DATABASE IF NOT EXISTS file_service;
"

# Run migrations for each service
docker exec user-app      php artisan migrate --force
docker exec template-app  php artisan migrate --force
docker exec file-app      php artisan migrate --force
```

### 5. Create the first admin user

```bash
docker exec user-app php artisan tinker --execute="
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

DB::table('users')->insert([
    'id'                => 'a3c5f3d8-91d1-4adf-9b2a-0c0a0ee3943a',
    'name'              => 'Admin',
    'email'             => 'admin@example.com',
    'password'          => Hash::make('password'),
    'company_id'        => '9d4e13c2-4b1a-4b02-9c38-90f487013f00',
    'email_verified_at' => Carbon::now(),
    'photo_url'         => null,
    'remember_token'    => null,
    'created_at'        => Carbon::now(),
    'updated_at'        => Carbon::now(),
]);
echo 'User created';
"
```

### 6. Open the app

Navigate to **http://localhost:5173** and log in with `admin@example.com` / `password`.

> Kafka consumers (`template-consumer`, `file-consumer`) start automatically as part of `docker compose up` and will restart on crash. No manual steps needed.

> For detailed troubleshooting and a full account of bugs fixed during setup, see [SETUP.md](./SETUP.md).

---

## API Reference

All requests go through Kong at `http://localhost:8000`. Protected routes require the `token` cookie set by the login endpoint.

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secret",
  "password_confirmation": "secret"
}
```
Creates a new user account and returns user data with a `token` cookie.

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```
Returns user data. Sets an HTTP-only cookie named `token` containing the RS256 JWT.

#### Get current user
```
GET /api/auth/me
```
Returns the authenticated user's data. Used by the frontend on page load to restore session state.

#### Logout
```
POST /api/auth/logout
```
Clears the `token` cookie.

---

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/templates/filters` | List templates (supports `?name=`, `?page=`, `?limit=`) |
| `POST` | `/api/templates` | Create a template |
| `PATCH` | `/api/templates/:id` | Update a template |
| `DELETE` | `/api/templates/:id` | Delete a template and all its sections |

### Sections

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sections/filters` | List sections (supports `?templateId=`) |
| `POST` | `/api/sections` | Create a section |
| `PATCH` | `/api/sections/:id` | Update section content or order |
| `DELETE` | `/api/sections/:id` | Delete a section |

### Tags & Contexts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/contexts/filters` | List contexts |
| `POST` | `/api/contexts` | Create a context |
| `PATCH` | `/api/contexts/:id` | Update a context |
| `DELETE` | `/api/contexts/:id` | Delete a context |
| `GET` | `/api/tags/filters` | List tags (supports `?name=`, `?contextId=`) |
| `POST` | `/api/tags` | Create a tag |
| `PATCH` | `/api/tags/:id` | Update a tag |
| `DELETE` | `/api/tags/:id` | Delete a tag |

### File Generation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files/async-generate` | Queue a PDF generation job |
| `GET` | `/api/files/filters` | List generated files |
| `GET` | `/api/files/download/:id` | Download a generated PDF |
| `DELETE` | `/api/files/:id` | Delete a file record |

#### async-generate payload
```json
{
  "templateId": "uuid-of-template",
  "name": "output-filename",
  "payload": {
    "#CLIENT_NAME#": "Jane Smith",
    "#CLIENT_CPF#": "000.000.000-00",
    "#CONTRACT_DATE#": "2025-01-01"
  }
}
```
Payload keys **must** be wrapped with `#` delimiters (e.g. `#TAG_NAME#`). This matches the placeholder format used inside template HTML (`#CLIENT_NAME#`). Sending keys without delimiters will result in a 422 validation error.

---

## Project Structure

```
DDocs/
├── backend/
│   ├── user-service/               # Laravel — Auth & JWT
│   │   ├── app/
│   │   │   ├── Application/        # Handlers, DTOs, Events, Services
│   │   │   ├── Domain/             # User entity, repository interface
│   │   │   └── Infrastructure/     # Controllers, repositories, Kafka, middleware
│   │   ├── tests/
│   │   │   ├── Feature/Auth/       # Login feature tests (4 tests)
│   │   │   └── Unit/Handlers/      # StoreAuthHandler unit tests (3 tests)
│   │   └── entrypoint.sh           # composer install → migrate → php-fpm
│   │
│   ├── template-service/           # Laravel — Templates, Sections, Tags, Contexts
│   │   ├── app/
│   │   │   ├── Application/        # 14 handlers (CRUD + PDF delivery)
│   │   │   ├── Domain/             # 4 entities, TagTypeEnum, 4 repository interfaces
│   │   │   └── Infrastructure/     # 4 controllers, Kafka consumer/producer
│   │   ├── tests/Feature/          # 16 feature tests (CRUD for all 4 entities)
│   │   ├── entrypoint.sh           # composer install → migrate → php-fpm
│   │   ├── consumer-entrypoint.sh  # waits for DB → kafka:consume-template-requested
│   │   └── queue-entrypoint.sh     # waits for DB → queue:work (processes Kafka producer jobs)
│   │
│   └── file-service/               # Laravel — File management & S3
│       ├── app/
│       │   ├── Application/        # Handlers for generate/download/destroy
│       │   ├── Domain/             # File entity, FileStatusEnum (PROCESSING/READY/ERROR)
│       │   └── Infrastructure/     # FileController, Kafka consumer/producer, S3
│       ├── tests/Feature/Files/    # 8 feature tests (generate, filters, destroy)
│       ├── entrypoint.sh           # composer install → migrate → php-fpm
│       ├── consumer-entrypoint.sh  # waits for DB → kafka:consume-template-delivered
│       └── queue-entrypoint.sh     # waits for DB → queue:work (processes Kafka producer jobs)
│
├── frontend/                       # React + TypeScript + Vite
│   └── src/
│       ├── components/
│       │   ├── DocumentsPage.tsx       # Template & section management with drag-and-drop
│       │   ├── GeneratePage.tsx        # Interactive PDF generation form
│       │   ├── FilesPage.tsx           # View, poll status, and download generated PDFs
│       │   ├── BatchPage.tsx           # Bulk generation via Excel upload
│       │   ├── ApiPage.tsx             # Full API reference documentation
│       │   ├── Editor.tsx              # Rich-text HTML editor with tag autocomplete
│       │   ├── DraggableSection.tsx    # Drag-and-drop section card
│       │   ├── ImportSectionModal.tsx  # Import a section from another template
│       │   ├── LoginPage.tsx
│       │   ├── SettingsPage.tsx
│       │   └── ProfilePage.tsx
│       ├── services/api.ts         # All API calls via fetch
│       ├── contexts/               # AuthContext (React Context API)
│       ├── types/                  # TypeScript interfaces
│       └── hooks/                  # use-toast, use-mobile
│
├── .docker/
│   ├── nginx/                      # Nginx configs per service
│   ├── kong/                       # kong-init.sh, JWT public key
│   ├── kafka/                      # Kafka topic init script
│   └── aws/                        # LocalStack S3 init
│
├── docker-compose.yml              # 20 services incl. consumer + queue workers
├── README.md                       # This file
└── SETUP.md                        # Full setup guide, bugs fixed, change history
```

---

## Running Tests

Tests use Pest PHP with an in-memory SQLite database — no running containers needed for unit and feature tests.

```bash
# user-service — 7 tests (3 unit + 4 feature)
docker exec user-app php artisan test --no-coverage

# template-service — 16 feature tests
docker exec template-app php artisan test --no-coverage

# file-service — 8 feature tests
docker exec file-app php artisan test --no-coverage
```

---

## Port Reference

| URL | Service | Notes |
|-----|---------|-------|
| `http://localhost:5173` | Frontend | React app — open in browser |
| `http://localhost:8000` | Kong Proxy | Entry point for all API calls |
| `http://localhost:8001` | Kong Admin | Kong management API |
| `http://localhost:8081` | user-service | Direct access (bypasses Kong) |
| `http://localhost:8082` | template-service | Direct access (bypasses Kong) |
| `http://localhost:8083` | file-service | Direct access (bypasses Kong) |
| `localhost:3306` | MySQL | root / root |
| `localhost:6379` | Redis | |
| `http://localhost:4566` | LocalStack | AWS S3 emulator |
| `localhost:9092–9094` | Kafka | Brokers 1, 2, 3 |
| `localhost:2181` | Zookeeper | |

---

## Roadmap

- [x] Autostart Kafka consumers on `docker compose up` with auto-restart
- [x] Autostart Laravel queue workers on `docker compose up` with auto-restart
- [x] User self-registration from the login page
- [x] Interactive Generate Document page (no API client needed)
- [x] Real-time PDF generation status (auto-polling on Files page)
- [x] Full API reference documentation page with dynamic payload builder
- [ ] Download template example (renders the template with placeholder data)
- [ ] Import section from another template
- [ ] Batch generation via Excel spreadsheet upload
- [ ] Migrate MySQL to PostgreSQL

---

## Contributing

Pull requests are welcome. For larger changes, open an issue first to discuss the approach.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes following the existing commit style
4. Open a pull request against `master`

Make sure all tests pass before submitting:
```bash
docker exec user-app     php artisan test --no-coverage
docker exec template-app php artisan test --no-coverage
docker exec file-app     php artisan test --no-coverage
```

---

## License

[MIT](./LICENSE)
