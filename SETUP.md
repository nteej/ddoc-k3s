# DDocs — Setup & Troubleshooting Guide

This document records every step taken to bring the project from a clean clone to a fully working state, including all bugs found and fixed along the way.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Architecture Summary](#3-architecture-summary)
4. [Step-by-Step Setup](#4-step-by-step-setup)
5. [Bugs Found and Fixed](#5-bugs-found-and-fixed)
6. [Running the Test Suite](#6-running-the-test-suite)
7. [Service URLs Reference](#7-service-urls-reference)
8. [First Login](#8-first-login)
9. [Kafka Consumers](#9-kafka-consumers)

---

## 1. Project Overview

DDocs is an open-source microservice platform for generating PDF documents from templates with dynamic tags. Admins define templates with placeholder tags; third-party systems submit data via API to trigger async PDF generation.

The project uses:
- **3 Laravel microservices** (user, template, file)
- **React + Vite frontend**
- **Kong API Gateway** for centralized routing and JWT validation
- **Kafka** (3-broker cluster) for async PDF generation messaging
- **MySQL** for persistence, **Redis** for caching, **LocalStack S3** for file storage

---

## 2. Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | 2.x |

No other local tools are required. PHP, Node.js, and Composer run inside containers.

---

## 3. Architecture Summary

```
Browser
  │
  └─► http://localhost:5173  (React frontend)
        │
        └─► http://localhost:8000  (Kong API Gateway)
               ├─► /api/auth/*        → user-service   (port 8081)
               ├─► /api/templates/*   → template-service (port 8082)
               ├─► /api/contexts/*    → template-service
               ├─► /api/tags/*        → template-service
               ├─► /api/sections/*    → template-service
               └─► /api/files/*       → file-service   (port 8083)

Kong enforces RS256 JWT validation on all routes except /api/auth/login and /api/auth/register.
The JWT token is delivered as an HTTP-only cookie named "token" after login.

Async PDF generation pipeline:
  file-service  ──Redis queue──►  file-queue worker  ──Kafka──►  template-consumer
                                                                        │
                                                           template-queue worker
                                                                        │
                                                              template-service
                                                             (render HTML + PDF)
                                                                        │
                                                               [template.delivered]
                                                                        │
                                                              file-consumer
                                                                        │
                                                          file-service (S3 upload)

Dedicated Docker Compose services (all restart: unless-stopped):
  template-consumer  →  php artisan kafka:consume-template-requested
  file-consumer      →  php artisan kafka:consume-template-delivered
  template-queue     →  php artisan queue:work  (processes queued Kafka producers)
  file-queue         →  php artisan queue:work  (processes queued Kafka producers)
```

---

## 4. Step-by-Step Setup

### Step 1 — Clone and enter the project

```bash
git clone <repo-url>
cd DDocs
```

### Step 2 — Copy environment files

Each service ships with a `.env.example`. Copy it to `.env` inside each service directory:

```bash
cp backend/user-service/.env.example     backend/user-service/.env
cp backend/template-service/.env.example backend/template-service/.env
cp backend/file-service/.env.example     backend/file-service/.env
```

> **Note:** The default `.env.example` files are pre-configured to work with Docker Compose networking (hostnames match container names). No changes are needed for local development.

### Step 3 — Start all containers

```bash
docker compose up -d
```

This starts all 20 services: MySQL, Redis, Zookeeper, 3 Kafka brokers, Kong + Postgres, 3 Laravel apps + Nginx, 2 Kafka consumer workers, 2 Laravel queue workers, LocalStack S3, and the React frontend.

Wait ~30 seconds for Kong to complete its health check and the `kong-init` container to register all routes.

### Step 4 — Create the MySQL databases

The databases are **not created automatically**. Run this once after the first `docker compose up`:

```bash
docker exec mysql-db mysql -uroot -proot -e "
  CREATE DATABASE IF NOT EXISTS user_service;
  CREATE DATABASE IF NOT EXISTS template_service;
  CREATE DATABASE IF NOT EXISTS file_service;
"
```

### Step 5 — Run migrations

Run Laravel migrations inside each application container:

```bash
docker exec user-app      php artisan migrate --force
docker exec template-app  php artisan migrate --force
docker exec file-app      php artisan migrate --force
```

Expected output for each: a list of migration files marked `DONE`.

### Step 6 — Create the first admin user

Use Laravel Tinker inside the user-service container:

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

You can change the email and password to anything you like.

### Step 7 — Verify the stack is working

```bash
# Login should return HTTP 200 with user data
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

Expected response:
```json
{
    "message": "Success",
    "data": {
        "id": "a3c5f3d8-91d1-4adf-9b2a-0c0a0ee3943a",
        "name": "Admin",
        "email": "admin@example.com"
    }
}
```

The JWT token is returned as an HTTP-only cookie named `token`. Keep this cookie for subsequent requests.

### Step 8 — Open the frontend

Navigate to **http://localhost:5173** in your browser.

> `http://localhost:8000` is the Kong API Gateway — it only handles `/api/*` paths and will return `"no Route matched"` for `/`.

---

## 5. Bugs Found and Fixed

The following bugs were identified during setup and fixed in the codebase.

---

### Bug 1 — LoginTest asserted token in JSON body (user-service)

**File:** `backend/user-service/tests/Feature/Auth/LoginTest.php`

**Problem:** The test expected `token` in the JSON response body. However, `AuthController::login` intentionally returns the token as an **HTTP-only cookie** (not in the JSON) for security reasons. The test assertion was wrong, not the controller.

**Fix:** Removed `'token'` from `assertJsonStructure` and replaced it with `assertCookie('token')`.

```php
// Before (wrong)
$response->assertJsonStructure([
    'data' => ['id', 'name', 'email', 'token']
]);

// After (correct)
$response->assertJsonStructure([
    'data' => ['id', 'name', 'email']
]);
$response->assertCookie('token');
```

---

### Bug 2 — Missing `tests/Unit` directory in template-service and file-service

**Files:**
- `backend/template-service/phpunit.xml`
- `backend/file-service/phpunit.xml`

**Problem:** Both `phpunit.xml` files referenced a `tests/Unit` directory that did not exist. PHPUnit exited with error code 2 even when all tests passed, masking clean runs.

**Fix:** Removed the `<testsuite name="Unit">` block from both files.

---

### Bug 3 — `RefreshDatabase` disabled in file-service tests

**File:** `backend/file-service/tests/Pest.php`

**Problem:** The `RefreshDatabase` trait was commented out. The SQLite in-memory database was configured in `phpunit.xml` but state leaked between tests.

**Fix:** Uncommented the `->use(Illuminate\Foundation\Testing\RefreshDatabase::class)` line.

---

### Bug 4 — No real tests in file-service (only placeholder scaffolding)

**File:** `backend/file-service/tests/Feature/ExampleTest.php` (replaced)

**Problem:** The file-service had only the default Laravel scaffold `ExampleTest.php` with no real coverage of the `FileController`.

**Fix:** Created `backend/file-service/tests/Feature/Files/FileTest.php` with 8 tests covering:
- `POST /api/files/async-generate` — success, validation errors, unauthenticated
- `GET /api/files/filters` — returns empty list, unauthenticated
- `DELETE /api/files/{id}` — 404 on missing file, success on existing file, unauthenticated

The JWT middleware in file-service only base64-decodes the token payload (no signature verification), so tests use a crafted fake bearer token. `TemplateRequestedEvent` is faked via `Event::fake()` so no Kafka connection is required.

---

### Bug 5 — `FileRepository` used camelCase on raw DB results (production bug)

**File:** `backend/file-service/app/Infrastructure/Repositories/FileRepository.php`

**Problem:** Two methods — `findOneById` and `findFirstUsingFilters` — mapped DB query results to `File::restore()` using camelCase property names (e.g. `$file->templateId`, `$file->userId`, `$file->createdAt`). PHP's DB query builder returns a `stdClass` with **snake_case** column names. This caused `Undefined property` errors in production on any `DELETE /api/files/{id}` or `download` call.

The `findAllUsingFilters` method (used by `findByFilters` and `download`) was already correct — only the two above methods were broken.

**Fix:** Changed all camelCase references to snake_case in both methods:

| Wrong | Correct |
|-------|---------|
| `$file->templateId` | `$file->template_id` |
| `$file->userId` | `$file->user_id` |
| `$file->readyToDownload` | `$file->ready_to_download` |
| `$file->createdAt` | `$file->created_at` |
| `$file->updatedAt` | `$file->updated_at` |

---

### Bug 6 — Frontend container had corrupted node_modules volume



**Problem:** The `frontend` Docker container failed to start due to a corrupted anonymous `node_modules` volume from a previous build:
```
Cannot find module '/app/node_modules/vite/dist/node/chunks/dep-D-7KCb9p.js'
```

The Dockerfile installs dependencies inside the image, but Docker Compose creates an anonymous volume for `/app/node_modules` that persists across container recreations. A stale volume from a prior build contained mismatched Vite chunk files.

**Fix:** Removed the container along with its anonymous volumes and rebuilt:
```bash
docker compose rm -svf frontend
docker compose up -d --build frontend
```

---

### Improvement 7 — Kafka consumers required manual startup

**Files added:**
- `backend/template-service/consumer-entrypoint.sh`
- `backend/file-service/consumer-entrypoint.sh`
- `backend/template-service/Dockerfile` (updated)
- `backend/file-service/Dockerfile` (updated)
- `docker-compose.yml` (updated)

**Problem:** After `docker compose up`, two Kafka consumers had to be started manually in separate terminals for PDF generation to work:
```bash
docker exec template-app php artisan kafka:consume-template-requested
docker exec file-app     php artisan kafka:consume-template-delivered
```
This was fragile — forgetting either command silently broke PDF generation with no error to the user.

**Fix:** Added two dedicated Docker Compose services (`template-consumer`, `file-consumer`) that start automatically alongside the rest of the stack. Each uses a `consumer-entrypoint.sh` that polls the database until migrations are ready, then launches the artisan consumer command. Both services are configured with `restart: unless-stopped` so Docker recovers them automatically on crash.

```yaml
# docker-compose.yml (excerpt)
template-consumer:
  build: ./backend/template-service
  entrypoint: ["consumer-entrypoint.sh"]
  restart: unless-stopped
  depends_on: [template-app, kafka1, kafka2, kafka3]

file-consumer:
  build: ./backend/file-service
  entrypoint: ["consumer-entrypoint.sh"]
  restart: unless-stopped
  depends_on: [file-app, kafka1, kafka2, kafka3]
```

Verify they are running:
```bash
docker ps | grep consumer
docker logs template-consumer --tail 20
docker logs file-consumer --tail 20
```

---

---

### Bug 8 — `ApiGatewayService` forwarded a null Authorization header

**File:** `backend/file-service/app/Application/Services/ApiGatewayService.php`

**Problem:** `getAuthorizationHeader()` called `LoggedUserHelper::token()`, which returned `$payload['token']`. The JWT payload only contains `userId`, `name`, `email`, and `companyId` — there is no `token` field. This caused every internal request from file-service to template-service to carry `Authorization: Bearer ` (empty bearer). Template-service rejected these with "Malformed token", and file handlers silently dropped all results, making generated files invisible in the Files page.

**Fix:** Replaced `LoggedUserHelper::token()` with direct extraction from the incoming HTTP request:

```php
protected function getAuthorizationHeader(): array
{
    $request = app(\Illuminate\Http\Request::class);
    $token = $request->cookie('token') ?? $request->bearerToken();
    return ['Authorization' => 'Bearer ' . ($token ?? '')];
}
```

---

### Bug 9 — Middleware alias syntax error in user-service `bootstrap/app.php`

**File:** `backend/user-service/bootstrap/app.php`

**Problem:** The `jwt.auth` middleware alias was registered using a comma instead of `=>`:

```php
// Broken — registers numeric index 0 → class name, not an alias
$middleware->alias(['jwt.auth', ExtractJwtClaimsMiddleware::class]);
```

This meant `jwt.auth` was never recognized as an alias, so any route using it (including the new `/auth/me` endpoint) would throw a "Class not found" or "Middleware not found" exception.

**Fix:**
```php
$middleware->alias(['jwt.auth' => ExtractJwtClaimsMiddleware::class]);
```

---

### Bug 10 — Laravel queue workers missing from Docker Compose (files stuck at "Processing")

**Files added:**
- `backend/template-service/queue-entrypoint.sh`
- `backend/file-service/queue-entrypoint.sh`
- `backend/template-service/Dockerfile` (updated)
- `backend/file-service/Dockerfile` (updated)
- `docker-compose.yml` (updated)

**Problem:** `TemplateRequestedListener` implements `ShouldQueue`, which dispatches the Kafka producer job to the Redis queue instead of executing it synchronously. Without a running `php artisan queue:work` process, jobs piled up in Redis unprocessed — files were created in the DB with status PROCESSING but the Kafka message was never sent, so template-service never received the request and PDFs were never generated.

**Fix:** Added `template-queue` and `file-queue` services to Docker Compose. Each runs a `queue-entrypoint.sh` that waits for the database and then starts `queue:work`:

```bash
#!/bin/bash
cd /var/www/html
until php artisan migrate:status > /dev/null 2>&1; do
    echo "[file-queue] Waiting for database..."; sleep 3
done
exec php artisan queue:work --sleep=3 --tries=3 --timeout=120
```

```yaml
file-queue:
  build: ./backend/file-service
  container_name: file-queue
  restart: unless-stopped
  entrypoint: ["queue-entrypoint.sh"]
  depends_on: [file-app, redis]
```

Verify they are running:
```bash
docker ps | grep queue
docker logs file-queue --tail 20
docker logs template-queue --tail 20
```

---

### Bug 11 — `Dompdf::stream()` crashed the Kafka consumer process

**File:** `backend/file-service/app/Domain/Services/FileGenerationService.php`

**Problem:** `generate()` called `$this->pdf->stream($filename)` at the end. `stream()` sends HTTP headers (`Content-Type: application/pdf`, `Content-Disposition`) and then calls `exit()`, which immediately terminates the PHP process. Since the Kafka consumer is a long-lived CLI process, calling `stream()` killed it after processing the very first message. Subsequent PDFs were never generated.

**Fix:** Removed the `stream()` call and used `output()` to get the PDF bytes, then wrote them to disk with `file_put_contents()`:

```php
$this->pdf->render();
file_put_contents($outputPath, $this->pdf->output());
return $uniqidFileName;
```

---

### Bug 12 — Wrong download URL and missing browser trigger in frontend

**File:** `frontend/src/services/api.ts`

**Problem:** `downloadGeneratedFile()` called `GET /api/files/{id}` (the file detail endpoint, not the download endpoint) and discarded the blob result — nothing was triggered in the browser.

**Fix:** Corrected URL to `/files/download/${fileId}` and implemented the blob → anchor click pattern:

```typescript
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${fileName}.pdf`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
window.URL.revokeObjectURL(url);
```

---

### Bug 13 — Payload tag format mismatch (`#TAG_NAME#` delimiters required)

**File:** `frontend/src/components/GeneratePage.tsx`

**Problem:** `FileTagsValidationService` extracts tags from templates using the regex `/#([A-Z_]+)#/`, so tag placeholders in HTML are written as `#CLIENT_NAME#`. When validating the payload, it expects keys in the same format: `#CLIENT_NAME#`. The frontend was sending bare tag names (`CLIENT_NAME`) without the hash delimiters, causing validation to report all tags as missing.

**Fix:** Wrap each key with `#` before submitting:

```typescript
const payload: Record<string, string> = {};
Object.entries(record.payload).forEach(([key, value]) => {
    payload[`#${key}#`] = value;
});
```

---

### Bug 14 — Missing `tmp` directory caused silent PDF write failure

**File:** `backend/file-service/app/Domain/Services/FileGenerationService.php`

**Problem:** `generate()` wrote the PDF to `storage/app/public/tmp/` but never created the directory. `file_put_contents()` silently failed when the directory didn't exist, leaving the file record in the DB with no actual PDF on disk.

**Fix:** Added a guard before writing:

```php
if (!is_dir($tmpDir)) {
    mkdir($tmpDir, 0775, true);
}
```

---

## 6. Running the Test Suite

All tests run inside Docker containers using in-memory SQLite — no external services needed.

```bash
# user-service: 7 tests (3 unit + 4 feature)
docker exec user-app php artisan test --no-coverage

# template-service: 16 feature tests
docker exec template-app php artisan test --no-coverage

# file-service: 8 feature tests
docker exec file-app php artisan test --no-coverage
```

Expected result for each:

```
Tests:    N passed (N assertions)
Duration: ~0.8s
```

> PHP 8.5 deprecation warnings from vendor packages (`PDO::MYSQL_ATTR_SSL_CA`, `ReflectionMethod::setAccessible`) appear in output but do not affect test results. These originate from third-party libraries and are not project bugs.

---

## 7. Service URLs Reference

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost:5173 | React app — open in browser |
| **Kong Proxy** | http://localhost:8000 | All API calls go through here |
| **Kong Admin** | http://localhost:8001 | Kong management API |
| **User Service** | http://localhost:8081 | Direct (bypasses Kong) |
| **Template Service** | http://localhost:8082 | Direct (bypasses Kong) |
| **File Service** | http://localhost:8083 | Direct (bypasses Kong) |
| **MySQL** | localhost:3306 | root / root |
| **Redis** | localhost:6379 | |
| **LocalStack S3** | http://localhost:4566 | |
| **Kafka Broker 1** | localhost:9092 | |
| **Kafka Broker 2** | localhost:9093 | |
| **Kafka Broker 3** | localhost:9094 | |
| **Zookeeper** | localhost:2181 | |

### Kong routes registered

| Path prefix | Routed to | Auth required |
|-------------|-----------|---------------|
| `POST /api/auth/login` | user-service | No |
| `POST /api/auth/register` | user-service | No |
| `GET /api/auth/me` | user-service | Yes (JWT cookie) |
| `POST /api/auth/logout` | user-service | Yes (JWT cookie) |
| `/api/templates/*` | template-service | Yes (JWT cookie) |
| `/api/contexts/*` | template-service | Yes (JWT cookie) |
| `/api/tags/*` | template-service | Yes (JWT cookie) |
| `/api/sections/*` | template-service | Yes (JWT cookie) |
| `/api/files/*` | file-service | Yes (JWT cookie) |

---

## 8. First Login

**Postman / curl:**

```
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
    "email": "admin@example.com",
    "password": "password"
}
```

The response sets a `token` HTTP-only cookie. All subsequent requests to protected routes must include this cookie.

In Postman: ensure **"Automatically manage cookies"** is enabled (Postman → Settings → General → Cookies). The `token` cookie from the login response will be sent automatically on follow-up requests to `localhost:8000`.

---

## 9. Kafka Consumers

Kafka consumers start **automatically** as dedicated Docker Compose services (`template-consumer`, `file-consumer`). They are configured with `restart: unless-stopped` so Docker restarts them if they crash.

```bash
# Check consumer status
docker ps | grep consumer

# View consumer logs
docker logs template-consumer --tail 20
docker logs file-consumer --tail 20
```

Each consumer has its own `consumer-entrypoint.sh` that waits for the database to be ready before starting the artisan consumer command:
- `template-consumer` → `php artisan kafka:consume-template-requested`
- `file-consumer` → `php artisan kafka:consume-template-delivered`

> **Before this change**, consumers had to be started manually in separate terminals after `docker compose up`. This was automated by adding dedicated consumer services to `docker-compose.yml` with custom entrypoints.
