#!/bin/bash
# Build and push all DynaDoc Flow service images.
#
# Remote registry (GHCR/Docker Hub):
#   REGISTRY=ghcr.io/your-org/dynadoc ./k8s/build-images.sh
#
# Local k3d (Mac) — build only, no push, then import:
#   REGISTRY=dynadoc ./k8s/build-images.sh --local
#   k3d image import dynadoc/user-service:latest dynadoc/template-service:latest \
#     dynadoc/file-service:latest dynadoc/audit-service:latest dynadoc/frontend:latest \
#     -c dynadoc

set -e

REGISTRY=${REGISTRY:?"Set REGISTRY, e.g. REGISTRY=ghcr.io/your-org/dynadoc  or  REGISTRY=dynadoc --local"}
TAG=${TAG:-latest}
LOCAL_ONLY=${1:-""}   # pass --local to skip docker push
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SERVICE_NAMES=(user-service template-service file-service audit-service frontend api-key-service webhook-service)
SERVICE_CTXS=(backend/user-service backend/template-service backend/file-service backend/audit-service frontend backend/api-key-service backend/webhook-service)

BUILT_IMAGES=()

for i in "${!SERVICE_NAMES[@]}"; do
  name="${SERVICE_NAMES[$i]}"
  ctx="${ROOT_DIR}/${SERVICE_CTXS[$i]}"
  image="${REGISTRY}/${name}:${TAG}"
  echo ""
  echo "==> Building: $image"
  docker build -t "$image" "$ctx"
  BUILT_IMAGES+=("$image")

  if [ "$LOCAL_ONLY" != "--local" ]; then
    echo "==> Pushing: $image"
    docker push "$image"
  fi
done

echo ""
if [ "$LOCAL_ONLY" = "--local" ]; then
  echo "All images built (local only — not pushed)."
  echo ""
  echo "Next: import into k3d cluster named 'dynadoc':"
  echo "  k3d image import ${BUILT_IMAGES[*]} -c dynadoc"
else
  echo "All images built and pushed successfully."
fi
echo ""
echo "Then deploy:"
echo "  REGISTRY=$REGISTRY TAG=$TAG ./k8s/deploy.sh"
