# Step 4: First Production Rollout (`ddoc.fi`)

This runbook is the first live deployment sequence for the single-node OVH VPS.

Prerequisites completed:

- Step 1: host reverse proxy and TLS are ready.
- Step 2: VPS + `k3s` are installed.
- Step 3: secrets are replaced with production values.

## 1. Prepare shell variables

Run on the OVH VPS inside the repo root.

```bash
cd /srv/dynadoc/dynadoc-flow
export REGISTRY=ghcr.io/<github-owner>/dynadoc
export TAG=<release-tag>
```

Validate images exist:

```bash
crane manifest "$REGISTRY/user-service:$TAG" >/dev/null
crane manifest "$REGISTRY/template-service:$TAG" >/dev/null
crane manifest "$REGISTRY/file-service:$TAG" >/dev/null
crane manifest "$REGISTRY/audit-service:$TAG" >/dev/null
crane manifest "$REGISTRY/frontend:$TAG" >/dev/null
```

If `crane` is not installed, use:

```bash
docker manifest inspect "$REGISTRY/user-service:$TAG" >/dev/null
```

## 2. Apply production Kong bootstrap config

Replace the local CORS bootstrap variant with the `ddoc.fi` one:

```bash
cp deploy/ovh/k8s/kong-init-cm.ddoc.fi.yaml k8s/configmaps/kong-init-cm.yaml
kubectl apply -f k8s/configmaps/kong-init-cm.yaml
```

## 3. Deploy full stack

```bash
make deploy
```

This executes the ordered deployment in `k8s/deploy.sh`:

1. namespaces
2. secrets and configmaps
3. databases and redis
4. zookeeper, kafka, topic init job
5. app services
6. consumers and queue workers
7. kong and kong-init job
8. frontend and localstack
9. observability stack

## 4. Re-run Kong init job if routes/plugins changed

Use this when Kong config was already present from a previous deployment:

```bash
kubectl delete job kong-init -n dynadoc --ignore-not-found
kubectl apply -f k8s/infra/kong-init-job.yaml
kubectl wait --for=condition=complete job/kong-init -n dynadoc --timeout=180s
```

## 5. Post-deploy validation checklist

Cluster health:

```bash
kubectl get pods -n dynadoc
kubectl get pods -n observability
kubectl get svc -n dynadoc
kubectl get svc -n observability
```

Public endpoint checks:

```bash
curl -I https://ddoc.fi
curl -I https://api.ddoc.fi
curl -I https://grafana.ddoc.fi
```

Kong route checks:

```bash
curl -i https://api.ddoc.fi/api/auth/login
curl -i https://api.ddoc.fi/api/templates
curl -i https://api.ddoc.fi/api/files
curl -i https://api.ddoc.fi/api/audit-logs
```

Expected behavior:

- `login` endpoint should respond without JWT requirement.
- template/file/audit endpoints should return auth-related response when no token is provided.

## 6. Smoke test flow

1. Login from `https://ddoc.fi`.
2. Create or open a template.
3. Trigger document generation.
4. Verify file appears in file list.
5. Verify audit records exist for login and generation events.

## 7. Rollback procedure (same tag model)

Set previous known-good tag and roll out service-by-service:

```bash
export TAG=<previous-good-tag>
make rollout-user
make rollout-template
make rollout-file
make rollout-audit
make rollout-frontend
```

If a rollout fails and is stuck:

```bash
make rollback-user
make rollback-template
make rollback-file
make rollback-audit
make rollback-frontend
```

## 8. Day-2 commands

```bash
make status
make logs-user
make logs-template
make logs-file
make logs-audit
make logs-frontend
```

Migrations:

```bash
make migrate-user
make migrate-template
make migrate-file
make migrate-audit
```