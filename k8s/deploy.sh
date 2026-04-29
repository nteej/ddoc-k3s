#!/bin/bash
# Deploy DynaDoc Flow to a k3s cluster in the correct dependency order.
#
# Prerequisites:
#   - kubectl configured to point at your k3s cluster
#   - Images pushed to a registry (run build-images.sh first)
#   - REGISTRY env var set to the same registry used in build-images.sh
#
# Usage:
#   REGISTRY=ghcr.io/your-org/dynadoc ./k8s/deploy.sh
#   REGISTRY=ghcr.io/your-org/dynadoc TAG=v1.2.0 ./k8s/deploy.sh

set -e

# REGISTRY can be:
#   ghcr.io/your-org/dynadoc  → remote registry (images named ghcr.io/your-org/dynadoc/user-service:TAG)
#   dynadoc                   → local k3d images (images named dynadoc/user-service:TAG)
REGISTRY=${REGISTRY:?"Set REGISTRY, e.g.\n  Remote: REGISTRY=ghcr.io/your-org/dynadoc\n  Local k3d: REGISTRY=dynadoc"}
TAG=${TAG:-latest}
K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Replace REGISTRY placeholder in all manifests before applying.
# Creates temp directory with substituted files; does NOT modify source files.
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Substituting REGISTRY=$REGISTRY TAG=$TAG into manifests..."
cp -r "$K8S_DIR"/. "$TMPDIR"/
# Replace the placeholder "REGISTRY/dynadoc/<service>" with "$REGISTRY/<service>"
find "$TMPDIR" -name "*.yaml" -exec \
  sed -i "s|REGISTRY/dynadoc/|${REGISTRY}/|g; s|:latest|:${TAG}|g" {} \;

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

echo ""
echo "=== Step 1: Namespaces ==="
kubectl apply -f "$TMPDIR/namespaces/"

echo ""
echo "=== Step 2: Secrets & ConfigMaps ==="
kubectl apply -f "$TMPDIR/secrets/"
kubectl apply -f "$TMPDIR/configmaps/"
kubectl apply -f "$TMPDIR/observability/configmaps/"

echo ""
echo "=== Step 3: Databases & Redis ==="
kubectl apply -f "$TMPDIR/apps/user/user-db.yaml"
kubectl apply -f "$TMPDIR/apps/template/template-db.yaml"
kubectl apply -f "$TMPDIR/apps/file/file-db.yaml"
kubectl apply -f "$TMPDIR/apps/audit/audit-db.yaml"
kubectl apply -f "$TMPDIR/infra/kong-db.yaml"
kubectl apply -f "$TMPDIR/infra/redis.yaml"
wait_rollout statefulset user-db dynadoc
wait_rollout statefulset template-db dynadoc
wait_rollout statefulset file-db dynadoc
wait_rollout statefulset audit-db dynadoc
wait_rollout statefulset kong-db dynadoc
wait_rollout deployment redis dynadoc

echo ""
echo "=== Step 4: Zookeeper → Kafka → Topics ==="
kubectl apply -f "$TMPDIR/infra/zookeeper.yaml"
wait_rollout deployment zookeeper dynadoc
kubectl apply -f "$TMPDIR/infra/kafka.yaml"
wait_rollout statefulset kafka dynadoc
kubectl apply -f "$TMPDIR/infra/kafka-init-job.yaml"
wait_job kafka-init dynadoc

echo ""
echo "=== Step 5: App Services ==="
kubectl apply -f "$TMPDIR/apps/user/user-app.yaml"
kubectl apply -f "$TMPDIR/apps/template/template-app.yaml"
kubectl apply -f "$TMPDIR/apps/file/file-app.yaml"
kubectl apply -f "$TMPDIR/apps/audit/audit-app.yaml"
wait_rollout deployment user-app dynadoc
wait_rollout deployment template-app dynadoc
wait_rollout deployment file-app dynadoc
wait_rollout deployment audit-app dynadoc

echo ""
echo "=== Step 6: Workers (Consumers & Queues) ==="
kubectl apply -f "$TMPDIR/apps/template/template-consumer.yaml"
kubectl apply -f "$TMPDIR/apps/template/template-queue.yaml"
kubectl apply -f "$TMPDIR/apps/file/file-consumer.yaml"
kubectl apply -f "$TMPDIR/apps/file/file-queue.yaml"
kubectl apply -f "$TMPDIR/apps/audit/audit-consumer.yaml"

echo ""
echo "=== Step 7: Kong → Routes & JWT Config ==="
kubectl apply -f "$TMPDIR/infra/kong.yaml"
wait_rollout deployment kong dynadoc
kubectl apply -f "$TMPDIR/infra/kong-init-job.yaml"
wait_job kong-init dynadoc

echo ""
echo "=== Step 8: Frontend & LocalStack ==="
kubectl apply -f "$TMPDIR/frontend/frontend.yaml"
kubectl apply -f "$TMPDIR/infra/localstack.yaml"

echo ""
echo "=== Step 9: Observability ==="
kubectl apply -f "$TMPDIR/observability/prometheus.yaml"
kubectl apply -f "$TMPDIR/observability/loki.yaml"
kubectl apply -f "$TMPDIR/observability/tempo.yaml"
wait_rollout deployment prometheus observability
wait_rollout deployment loki observability
wait_rollout deployment tempo observability
kubectl apply -f "$TMPDIR/observability/grafana.yaml"
kubectl apply -f "$TMPDIR/observability/promtail.yaml"
kubectl apply -f "$TMPDIR/observability/cadvisor.yaml"

echo ""
echo "============================================"
echo "Deployment complete!"
echo "============================================"
echo ""
echo "NodePort access (replace NODE_IP with your k3s node IP):"
echo "  Kong proxy:  http://NODE_IP:30800"
echo "  Frontend:    http://NODE_IP:30573"
echo "  Grafana:     http://NODE_IP:30300"
echo "  LocalStack:  http://NODE_IP:30566"
echo ""
echo "IMPORTANT: Update NODE_IP in kong-init-cm.yaml CORS config to match your node IP."
echo "  Then re-run: kubectl apply -f k8s/configmaps/kong-init-cm.yaml"
echo "  And re-run the kong-init job."
echo ""
echo "Pod status:"
kubectl get pods -n dynadoc
echo ""
kubectl get pods -n observability
