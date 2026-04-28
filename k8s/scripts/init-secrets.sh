#!/usr/bin/env bash
# init-secrets.sh — Bootstrap all Kubernetes secrets from environment variables.
#
# Run ONCE on initial VPS setup, or after rotating secrets.
# Never committed — secrets only live in the environment and in k8s.
#
# Usage:
#   source /path/to/.env.prod && ./k8s/scripts/init-secrets.sh
#
# Required environment variables:
#   USER_APP_KEY           Laravel APP_KEY for user-service
#   TEMPLATE_APP_KEY       Laravel APP_KEY for template-service
#   FILE_APP_KEY           Laravel APP_KEY for file-service
#   AUDIT_APP_KEY          Laravel APP_KEY for audit-service
#
#   USER_DB_PASSWORD       Postgres password for user-service DB
#   TEMPLATE_DB_PASSWORD   Postgres password for template-service DB
#   FILE_DB_PASSWORD       Postgres password for file-service DB
#   AUDIT_DB_PASSWORD      Postgres password for audit-service DB
#
#   KONG_JWT_SECRET        RS256 public key (PEM) used by Kong to verify JWTs
#   JWT_PRIVATE_KEY        RS256 private key (PEM) used by user-service to sign JWTs
#
#   GHCR_USER              GitHub username for GHCR image pull
#   GHCR_PAT               GitHub PAT with read:packages scope
#
# Optional:
#   MAIL_USERNAME          SMTP username (for notification emails)
#   MAIL_PASSWORD          SMTP password

set -euo pipefail

NS=dynadoc

die() { echo "ERROR: $*" >&2; exit 1; }
need() { [[ -n "${!1:-}" ]] || die "Missing required env var: $1"; }

need USER_APP_KEY
need TEMPLATE_APP_KEY
need FILE_APP_KEY
need AUDIT_APP_KEY
need USER_DB_PASSWORD
need TEMPLATE_DB_PASSWORD
need FILE_DB_PASSWORD
need AUDIT_DB_PASSWORD
need GHCR_USER
need GHCR_PAT

echo "==> Ensuring namespace ${NS} exists"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -

# ─── App secrets ──────────────────────────────────────────────────────────────

echo "==> App secrets"
kubectl create secret generic user-app-secret \
  --namespace="$NS" \
  --from-literal=APP_KEY="${USER_APP_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic template-app-secret \
  --namespace="$NS" \
  --from-literal=APP_KEY="${TEMPLATE_APP_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic file-app-secret \
  --namespace="$NS" \
  --from-literal=APP_KEY="${FILE_APP_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic audit-app-secret \
  --namespace="$NS" \
  --from-literal=APP_KEY="${AUDIT_APP_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

# ─── DB secrets ───────────────────────────────────────────────────────────────

echo "==> DB secrets"
kubectl create secret generic user-db-secret \
  --namespace="$NS" \
  --from-literal=POSTGRES_DB=user_service \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD="${USER_DB_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic template-db-secret \
  --namespace="$NS" \
  --from-literal=POSTGRES_DB=template_service \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD="${TEMPLATE_DB_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic file-db-secret \
  --namespace="$NS" \
  --from-literal=POSTGRES_DB=file_service \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD="${FILE_DB_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic audit-db-secret \
  --namespace="$NS" \
  --from-literal=POSTGRES_DB=audit_service \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD="${AUDIT_DB_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

# ─── JWT / Kong secret ────────────────────────────────────────────────────────

if [[ -n "${KONG_JWT_SECRET:-}" && -n "${JWT_PRIVATE_KEY:-}" ]]; then
  echo "==> JWT secrets"
  kubectl create secret generic kong-jwt-secret \
    --namespace="$NS" \
    --from-literal=RS256_PUBLIC_KEY="${KONG_JWT_SECRET}" \
    --from-literal=RS256_PRIVATE_KEY="${JWT_PRIVATE_KEY}" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

# ─── Mail secrets (optional) ─────────────────────────────────────────────────

if [[ -n "${MAIL_USERNAME:-}" && -n "${MAIL_PASSWORD:-}" ]]; then
  echo "==> Mail secrets"
  kubectl create secret generic mail-secret \
    --namespace="$NS" \
    --from-literal=MAIL_USERNAME="${MAIL_USERNAME}" \
    --from-literal=MAIL_PASSWORD="${MAIL_PASSWORD}" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

# ─── GHCR image pull secret ──────────────────────────────────────────────────

echo "==> GHCR image pull secret"
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace="$NS" \
  --docker-server=ghcr.io \
  --docker-username="${GHCR_USER}" \
  --docker-password="${GHCR_PAT}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Patch default service account so all pods in dynadoc can pull from GHCR
kubectl patch serviceaccount default \
  --namespace="$NS" \
  -p '{"imagePullSecrets":[{"name":"ghcr-pull-secret"}]}'

echo ""
echo "All secrets created/updated in namespace ${NS}."
echo ""
echo "Next: verify with  kubectl get secrets -n ${NS}"
