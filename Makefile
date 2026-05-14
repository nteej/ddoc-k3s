SHELL := /bin/bash
.DEFAULT_GOAL := help

# ─── Registry / Tag ──────────────────────────────────────────────────────────
OWNER  := $(shell git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\)\/.*/\1/' | tr '[:upper:]' '[:lower:]')
REGISTRY ?= ghcr.io/$(OWNER)/dynadoc
TAG      ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "local")
NS       := dynadoc

.PHONY: help
help:  ## Show this help
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ─── Testing ──────────────────────────────────────────────────────────────────

.PHONY: test-all
test-all: test-user test-template test-file test-audit  ## Run all PHP service tests

.PHONY: test-user
test-user:  ## Test user-service
	cd backend/user-service && php artisan test --parallel

.PHONY: test-template
test-template:  ## Test template-service
	cd backend/template-service && php artisan test --parallel

.PHONY: test-file
test-file:  ## Test file-service
	cd backend/file-service && php artisan test --parallel

.PHONY: test-audit
test-audit:  ## Test audit-service
	cd backend/audit-service && php artisan test --parallel

.PHONY: lint
lint:  ## Lint frontend (eslint)
	cd frontend && npm run lint

.PHONY: build-frontend-check
build-frontend-check:  ## TypeScript + build check for frontend
	cd frontend && npm run build

# ─── Docker build / push ─────────────────────────────────────────────────────

.PHONY: build
build:  ## Build all service images locally (no push)
	REGISTRY=$(REGISTRY) TAG=$(TAG) ./k8s/build-images.sh --local

.PHONY: push
push:  ## Build and push all images to GHCR
	REGISTRY=$(REGISTRY) TAG=$(TAG) ./k8s/build-images.sh

.PHONY: push-service
push-service:  ## Build and push a single service: make push-service SVC=user-service
	@test -n "$(SVC)" || (echo "Usage: make push-service SVC=user-service" && exit 1)
	docker build -t $(REGISTRY)/$(SVC):$(TAG) backend/$(SVC) || docker build -t $(REGISTRY)/$(SVC):$(TAG) $(SVC)
	docker push $(REGISTRY)/$(SVC):$(TAG)
	docker tag $(REGISTRY)/$(SVC):$(TAG) $(REGISTRY)/$(SVC):latest
	docker push $(REGISTRY)/$(SVC):latest

# ─── Kustomize / IaC ──────────────────────────────────────────────────────────

.PHONY: validate
validate:  ## Validate production overlay renders without errors
	@kubectl kustomize overlays/production > /dev/null && echo "✓ kustomize build OK"
	@kubectl apply --dry-run=client -k overlays/production/ > /dev/null && echo "✓ dry-run OK"

.PHONY: diff
diff:  ## Show diff between desired state and live cluster (requires cluster access)
	kubectl diff -k overlays/production/ 2>/dev/null || true

.PHONY: apply
apply:  ## Idempotent apply of full desired state (skips ordering — use deploy for first install)
	kubectl apply -k overlays/production/

.PHONY: overlay-tag
overlay-tag:  ## Pin a release tag in the production overlay: make overlay-tag TAG=v1.8.0
	@test -n "$(TAG)" || (echo "Usage: make overlay-tag TAG=v1.8.0" && exit 1)
	@sed -i "s|^\(\s*newTag:\) .*|\1 $(TAG)|g" overlays/production/kustomization.yaml
	@echo "Updated overlay image tags to $(TAG)"
	@grep newTag overlays/production/kustomization.yaml

# ─── Deployment ───────────────────────────────────────────────────────────────

.PHONY: deploy
deploy:  ## Full initial deploy to k3s (all services, in order)
	REGISTRY=$(REGISTRY) TAG=$(TAG) ./k8s/deploy.sh

.PHONY: rollout-user
rollout-user:  ## Rolling update user-service with current TAG
	kubectl set image deployment/user-app php-fpm=$(REGISTRY)/user-service:$(TAG) copy-public=$(REGISTRY)/user-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/user-app -n $(NS) --timeout=180s

.PHONY: rollout-template
rollout-template:  ## Rolling update template-service with current TAG
	kubectl set image deployment/template-app php-fpm=$(REGISTRY)/template-service:$(TAG) copy-public=$(REGISTRY)/template-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/template-app -n $(NS) --timeout=180s
	kubectl set image deployment/template-consumer template-consumer=$(REGISTRY)/template-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/template-consumer -n $(NS) --timeout=180s
	kubectl set image deployment/template-queue template-queue=$(REGISTRY)/template-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/template-queue -n $(NS) --timeout=180s

.PHONY: rollout-file
rollout-file:  ## Rolling update file-service with current TAG
	kubectl set image deployment/file-app php-fpm=$(REGISTRY)/file-service:$(TAG) copy-public=$(REGISTRY)/file-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/file-app -n $(NS) --timeout=180s
	kubectl set image deployment/file-consumer file-consumer=$(REGISTRY)/file-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/file-consumer -n $(NS) --timeout=180s
	kubectl set image deployment/file-queue file-queue=$(REGISTRY)/file-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/file-queue -n $(NS) --timeout=180s

.PHONY: rollout-audit
rollout-audit:  ## Rolling update audit-service with current TAG
	kubectl set image deployment/audit-app php-fpm=$(REGISTRY)/audit-service:$(TAG) copy-public=$(REGISTRY)/audit-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/audit-app -n $(NS) --timeout=180s
	kubectl set image deployment/audit-consumer audit-consumer=$(REGISTRY)/audit-service:$(TAG) -n $(NS)
	kubectl rollout status deployment/audit-consumer -n $(NS) --timeout=180s

.PHONY: rollout-frontend
rollout-frontend:  ## Rolling update frontend with current TAG
	kubectl set image deployment/frontend frontend=$(REGISTRY)/frontend:$(TAG) -n $(NS)
	kubectl rollout status deployment/frontend -n $(NS) --timeout=180s

# ─── Rollback ─────────────────────────────────────────────────────────────────

.PHONY: rollback-user
rollback-user:  ## Undo last user-service rollout
	kubectl rollout undo deployment/user-app -n $(NS)

.PHONY: rollback-template
rollback-template:  ## Undo last template-service rollout
	kubectl rollout undo deployment/template-app -n $(NS)
	kubectl rollout undo deployment/template-consumer -n $(NS)
	kubectl rollout undo deployment/template-queue -n $(NS)

.PHONY: rollback-file
rollback-file:  ## Undo last file-service rollout
	kubectl rollout undo deployment/file-app -n $(NS)
	kubectl rollout undo deployment/file-consumer -n $(NS)
	kubectl rollout undo deployment/file-queue -n $(NS)

.PHONY: rollback-audit
rollback-audit:  ## Undo last audit-service rollout
	kubectl rollout undo deployment/audit-app -n $(NS)
	kubectl rollout undo deployment/audit-consumer -n $(NS)

.PHONY: rollback-frontend
rollback-frontend:  ## Undo last frontend rollout
	kubectl rollout undo deployment/frontend -n $(NS)

# ─── Observability ───────────────────────────────────────────────────────────

.PHONY: status
status:  ## Show all pod status
	@echo "=== dynadoc ===" && kubectl get pods -n $(NS)
	@echo "" && echo "=== observability ===" && kubectl get pods -n observability 2>/dev/null || true

.PHONY: logs-user
logs-user:  ## Tail user-service PHP-FPM logs
	kubectl logs -f deployment/user-app -c php-fpm -n $(NS)

.PHONY: logs-template
logs-template:  ## Tail template-service PHP-FPM logs
	kubectl logs -f deployment/template-app -c php-fpm -n $(NS)

.PHONY: logs-file
logs-file:  ## Tail file-service PHP-FPM logs
	kubectl logs -f deployment/file-app -c php-fpm -n $(NS)

.PHONY: logs-audit
logs-audit:  ## Tail audit-service PHP-FPM logs
	kubectl logs -f deployment/audit-app -c php-fpm -n $(NS)

.PHONY: logs-frontend
logs-frontend:  ## Tail frontend logs
	kubectl logs -f deployment/frontend -n $(NS)

# ─── Secrets bootstrap ────────────────────────────────────────────────────────

.PHONY: init-secrets
init-secrets:  ## Bootstrap k8s secrets from environment (run once on VPS)
	chmod +x ./k8s/scripts/init-secrets.sh
	./k8s/scripts/init-secrets.sh

# ─── Migrations ───────────────────────────────────────────────────────────────

.PHONY: migrate-user
migrate-user:  ## Run migrations inside running user-app pod
	kubectl exec -n $(NS) deployment/user-app -c php-fpm -- php artisan migrate --force

.PHONY: migrate-template
migrate-template:
	kubectl exec -n $(NS) deployment/template-app -c php-fpm -- php artisan migrate --force

.PHONY: migrate-file
migrate-file:
	kubectl exec -n $(NS) deployment/file-app -c php-fpm -- php artisan migrate --force

.PHONY: migrate-audit
migrate-audit:
	kubectl exec -n $(NS) deployment/audit-app -c php-fpm -- php artisan migrate --force
