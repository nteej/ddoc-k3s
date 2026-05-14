#!/bin/bash
# Deploy DynaDoc Flow to a k3s cluster in the correct dependency order.
#
# Uses Kustomize overlays for image substitution — no more sed on every file.
#
# Prerequisites:
#   - kubectl configured to point at your k3s cluster
#   - Images pushed to GHCR (run build-images.sh first)
#   - Secrets already bootstrapped via:  make init-secrets
#
# Usage:
#   REGISTRY=ghcr.io/nteej/dynadoc ./k8s/deploy.sh
#   REGISTRY=ghcr.io/nteej/dynadoc TAG=v1.2.0 ./k8s/deploy.sh

set -euo pipefail

REGISTRY=${REGISTRY:?"Set REGISTRY, e.g.\n  REGISTRY=ghcr.io/nteej/dynadoc"}
TAG=${TAG:-latest}
K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$K8S_DIR/.." && pwd)"
OVERLAY="$REPO_DIR/overlays/production"
NS=dynadoc

# ─── Render the production overlay ──────────────────────────────────────────
# Build a temp overlay that swaps the default "latest" tags with $TAG.
# We copy only the overlay kustomization.yaml and sed just that one file,
# keeping base manifests untouched and the committed overlay unchanged.

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp -r "$REPO_DIR/overlays" "$TMPDIR/overlays"
cp -r "$K8S_DIR" "$TMPDIR/k8s"

# Substitute the real registry and tag in the temp overlay only.
# Matches the trailing service name (e.g. /user-service, /frontend) so that
# any value already in the overlay's newName is replaced correctly.
OVERLAY_TMP="$TMPDIR/overlays/production/kustomization.yaml"
sed -i \
  -e "s|newName: [^[:space:]]*/\([a-z-]*-service\)$|newName: ${REGISTRY}/\1|g" \
  -e "s|newName: [^[:space:]]*/frontend$|newName: ${REGISTRY}/frontend|g" \
  -e "s|newTag: [^[:space:]#]*|newTag: ${TAG}|g" \
  "$OVERLAY_TMP"

echo "Rendering kustomize overlay (REGISTRY=${REGISTRY} TAG=${TAG})..."
kubectl kustomize "$TMPDIR/overlays/production" > "$TMPDIR/rendered.yaml"

echo "Splitting into individual resource files..."
python3 "$K8S_DIR/scripts/split-yaml.py" "$TMPDIR/rendered.yaml" "$TMPDIR/split"

# ─── Helpers ────────────────────────────────────────────────────────────────

s() { "$TMPDIR/split/$1"; }   # shorthand: path to a split resource file

apply() {
  local file="$TMPDIR/split/$1"
  if [ -f "$file" ]; then
    kubectl apply -f "$file"
  else
    echo "  [skip] $1 not found in rendered output"
  fi
}

wait_rollout() {
  local kind=$1 name=$2 ns=$3
  echo "  Waiting for $kind/$name in $ns..."
  kubectl rollout status "$kind/$name" -n "$ns" --timeout=420s
}

wait_job() {
  local name=$1 ns=$2
  echo "  Waiting for job/$name in $ns..."
  kubectl wait --for=condition=complete "job/$name" -n "$ns" --timeout=180s
}

# Jobs are immutable — delete before re-applying so the job can re-run.
delete_job() {
  kubectl delete job "$1" -n "$2" --ignore-not-found=true
}

# ─── GHCR pull secret (needed for private images) ───────────────────────────
if [ -n "${GHCR_TOKEN:-}" ]; then
  kubectl create secret docker-registry ghcr-pull-secret \
    --namespace "$NS" \
    --docker-server=ghcr.io \
    --docker-username="${GHCR_USER:-nteej}" \
    --docker-password="$GHCR_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

# ─── Step 1: Namespaces ──────────────────────────────────────────────────────
echo ""
echo "=== Step 1: Namespaces ==="
apply "namespace-dynadoc.yaml"
apply "namespace-observability.yaml"

# ─── Step 2: Secrets & ConfigMaps ───────────────────────────────────────────
echo ""
echo "=== Step 2: ConfigMaps ==="
apply "configmap-kafka-config.yaml"
apply "configmap-kong-routes.yaml"
apply "configmap-nginx-configs.yaml"
apply "configmap-openapi-spec.yaml"
# Apply any configmaps not individually listed
kubectl apply -f "$TMPDIR/rendered.yaml" --selector 'kind=ConfigMap' 2>/dev/null || true

echo ""
echo "=== Step 2b: Secrets (from committed files — prefer init-secrets.sh for prod) ==="
if ls "$K8S_DIR/secrets/"*.yaml 1>/dev/null 2>&1; then
  kubectl apply -f "$K8S_DIR/secrets/"
fi

# ─── Step 3: Databases & Redis ──────────────────────────────────────────────
echo ""
echo "=== Step 3: Databases & Redis ==="
apply "statefulset-user-db.yaml";     apply "service-user-db-svc.yaml"
apply "statefulset-template-db.yaml"; apply "service-template-db-svc.yaml"
apply "statefulset-file-db.yaml";     apply "service-file-db-svc.yaml"
apply "statefulset-audit-db.yaml";    apply "service-audit-db-svc.yaml"
apply "statefulset-api-key-db.yaml";  apply "service-api-key-db-svc.yaml"
apply "statefulset-webhook-db.yaml";  apply "service-webhook-db-svc.yaml"
apply "statefulset-kong-db.yaml";     apply "service-kong-db-svc.yaml"
apply "deployment-redis.yaml";        apply "service-redis-svc.yaml"
wait_rollout statefulset user-db      "$NS"
wait_rollout statefulset template-db  "$NS"
wait_rollout statefulset file-db      "$NS"
wait_rollout statefulset audit-db     "$NS"
wait_rollout statefulset api-key-db   "$NS"
wait_rollout statefulset webhook-db   "$NS"
wait_rollout statefulset kong-db      "$NS"
wait_rollout deployment   redis       "$NS"

# ─── Step 4: Zookeeper → Kafka → Topics ─────────────────────────────────────
echo ""
echo "=== Step 4: Zookeeper → Kafka → Topics ==="
apply "deployment-zookeeper.yaml";  apply "service-zookeeper-svc.yaml"
wait_rollout deployment zookeeper "$NS"
apply "statefulset-kafka.yaml";     apply "service-kafka-svc.yaml"; apply "service-kafka-headless.yaml"
wait_rollout statefulset kafka "$NS"
delete_job kafka-init "$NS"
apply "job-kafka-init.yaml"
wait_job kafka-init "$NS"

# ─── Step 5: App Services ───────────────────────────────────────────────────
echo ""
echo "=== Step 5: App Services ==="
apply "deployment-user-app.yaml";        apply "service-user-svc.yaml"
apply "deployment-template-app.yaml";    apply "service-template-svc.yaml"
apply "deployment-file-app.yaml";        apply "service-file-svc.yaml"
apply "deployment-audit-app.yaml";       apply "service-audit-svc.yaml"
apply "deployment-api-key-app.yaml";     apply "service-api-key-svc.yaml"
apply "deployment-webhook-app.yaml";     apply "service-webhook-svc.yaml"
apply "deployment-notification-app.yaml"; apply "service-notification-svc.yaml"
wait_rollout deployment user-app         "$NS"
wait_rollout deployment template-app     "$NS"
wait_rollout deployment file-app         "$NS"
wait_rollout deployment audit-app        "$NS"
wait_rollout deployment api-key-app      "$NS"
wait_rollout deployment webhook-app      "$NS"
wait_rollout deployment notification-app "$NS"

# ─── Step 6: Workers (Consumers & Queues) ───────────────────────────────────
echo ""
echo "=== Step 6: Workers ==="
# Headless services for consumer pods
kubectl apply -f "$TMPDIR/split/service-template-consumer-headless.yaml" 2>/dev/null || true
kubectl apply -f "$TMPDIR/split/service-file-consumer-headless.yaml"     2>/dev/null || true
kubectl apply -f "$TMPDIR/split/service-audit-consumer-headless.yaml"    2>/dev/null || true
apply "deployment-template-consumer.yaml"
apply "deployment-template-queue.yaml"
apply "deployment-file-consumer.yaml"
apply "deployment-file-queue.yaml"
apply "deployment-audit-consumer.yaml"
apply "deployment-notification-consumer.yaml"

# ─── Step 7: Kong → Routes & JWT Config ─────────────────────────────────────
echo ""
echo "=== Step 7: Kong → Routes & JWT Config ==="
apply "deployment-kong.yaml"; apply "service-kong-svc.yaml"
wait_rollout deployment kong "$NS"
delete_job kong-init "$NS"
apply "job-kong-init.yaml"
wait_job kong-init "$NS"

# ─── Step 8: Frontend, LocalStack & Swagger ─────────────────────────────────
echo ""
echo "=== Step 8: Frontend, LocalStack & Swagger ==="
apply "deployment-frontend.yaml"; apply "service-frontend-svc.yaml"
apply "deployment-localstack.yaml"; apply "service-localstack-svc.yaml"
apply "deployment-swagger-ui.yaml"; apply "service-swagger-svc.yaml"

# ─── Step 9: Traefik TLS & Ingress ──────────────────────────────────────────
echo ""
echo "=== Step 9: Traefik TLS & Ingress ==="
apply "middleware-https-redirect.yaml"
apply "middleware-www-redirect.yaml"
# Apply all IngressRoute and Ingress resources
find "$TMPDIR/split" -name "ingressroute-*.yaml" -o -name "ingress-*.yaml" \
  | xargs -r kubectl apply -f

# ─── Step 10: Observability ─────────────────────────────────────────────────
echo ""
echo "=== Step 10: Observability ==="
# Apply all observability configmaps
find "$TMPDIR/split" -name "configmap-*" | xargs -r kubectl apply -f
apply "deployment-prometheus.yaml"
apply "deployment-loki.yaml"
apply "deployment-tempo.yaml"
wait_rollout deployment prometheus observability
wait_rollout deployment loki       observability
wait_rollout deployment tempo      observability
apply "deployment-grafana.yaml"
apply "daemonset-promtail.yaml"
apply "daemonset-cadvisor.yaml"
apply "deployment-kube-state-metrics.yaml"
apply "daemonset-node-exporter.yaml"
apply "deployment-alertmanager.yaml"

echo ""
echo "============================================"
echo " Deployment complete!  TAG=${TAG}"
echo "============================================"
echo ""
echo "Access (replace NODE_IP with your k3s node IP):"
echo "  Kong proxy:  http://NODE_IP:30800"
echo "  Frontend:    http://NODE_IP:30573"
echo "  Grafana:     http://NODE_IP:30300"
echo "  LocalStack:  http://NODE_IP:30566"
echo ""
echo "Pod status:"
kubectl get pods -n "$NS"
echo ""
kubectl get pods -n observability 2>/dev/null || true
