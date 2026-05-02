# DynaDoc Deployment Guide

## Overview

DynaDoc runs on a k3s Kubernetes cluster on an OVH VPS. Deployments are fully automated via GitHub Actions CD pipeline triggered by GitHub Releases. All container images are hosted on GitHub Container Registry (GHCR).

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Server | OVH VPS (Ubuntu 24.04) |
| Orchestration | k3s (Kubernetes) |
| Namespace | `dynadoc` |
| Registry | `ghcr.io/<owner>/dynadoc/` |
| Domain | `https://ddoc.fi` |
| Git remote | `git@github.com:nteej/ddoc-k3s.git` |

---

## Prerequisites

### VPS access
- SSH key added to the server's `authorized_keys`
- `deploy` user owns the repo at `/srv/dynadoc/dynadoc-flow`

### GitHub secrets (Settings → Secrets → Actions)

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH user (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private key for SSH access |
| `GHCR_TOKEN` | Classic PAT with `read:packages` + `write:packages` scope |

### Deploy key
An Ed25519 SSH key is registered at `https://github.com/nteej/ddoc-k3s/settings/keys` (write access) so the VPS can push directly.

- Private key: `/home/deploy/.ssh/id_ed25519`
- Public key: `/home/deploy/.ssh/id_ed25519.pub`

---

## Standard Release Deployment

### 1. Commit and push changes

```bash
# All git operations run as the deploy user
sudo -u deploy git -C /srv/dynadoc/dynadoc-flow add <files>
sudo -u deploy git -C /srv/dynadoc/dynadoc-flow commit -m "feat: description"
sudo -u deploy git -C /srv/dynadoc/dynadoc-flow push origin master
```

### 2. Create and publish a GitHub release

Replace `v1.x.x` with the next semantic version.

```bash
curl -s -X POST \
  -H "Authorization: token <GITHUB_PAT>" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/nteej/ddoc-k3s/releases \
  -d '{
    "tag_name": "v1.x.x",
    "target_commitish": "master",
    "name": "v1.x.x — Short description",
    "body": "## What'\''s new\n\n- Change 1\n- Change 2",
    "draft": false,
    "prerelease": false
  }'
```

Or via GitHub UI: **Releases → Draft a new release → Publish release**.

Publishing the release triggers `.github/workflows/cd.yml` which:
1. Resolves the tag
2. Builds all service images in parallel and pushes to GHCR
3. SSHs into the VPS and rolling-deploys each service via `kubectl set image`

Monitor progress at: `https://github.com/nteej/ddoc-k3s/actions`

---

## Deploy a Single Service

Use `workflow_dispatch` from the GitHub Actions UI or via API:

```bash
curl -s -X POST \
  -H "Authorization: token <GITHUB_PAT>" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/nteej/ddoc-k3s/actions/workflows/cd.yml/dispatches \
  -d '{
    "ref": "master",
    "inputs": {
      "tag": "latest",
      "service": "notification"
    }
  }'
```

Valid `service` values: `user`, `template`, `file`, `audit`, `api-key`, `webhook`, `notification`, `frontend`. Leave empty to deploy all.

---

## Rollback

### Rollback a single deployment to the previous image

```bash
kubectl rollout undo deployment/<name> -n dynadoc
# e.g.
kubectl rollout undo deployment/notification-app -n dynadoc
kubectl rollout undo deployment/user-app -n dynadoc
```

### Rollback to a specific release tag

Re-run the CD workflow with the old tag via `workflow_dispatch`:

```bash
curl -s -X POST \
  -H "Authorization: token <GITHUB_PAT>" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/nteej/ddoc-k3s/actions/workflows/cd.yml/dispatches \
  -d '{"ref": "master", "inputs": {"tag": "v1.2.0", "service": ""}}'
```

---

## Manual kubectl Operations

```bash
# View all pods
kubectl get pods -n dynadoc

# Tail logs for a service
kubectl logs -n dynadoc -l app=notification-app -f --tail=100
kubectl logs -n dynadoc -l app=user-app -c php-fpm -f --tail=100

# Describe a failing pod
kubectl describe pod -n dynadoc <pod-name>

# Check rollout status
kubectl rollout status deployment/user-app -n dynadoc

# Force restart a deployment (picks up same image)
kubectl rollout restart deployment/notification-app -n dynadoc
```

---

## Kubernetes Resources — Deployments

| Deployment | Containers | Image |
|------------|-----------|-------|
| `user-app` | `php-fpm`, `nginx`, `copy-public` (init) | `user-service` |
| `template-app` | `php-fpm`, `nginx`, `copy-public` (init) | `template-service` |
| `file-app` | `php-fpm`, `nginx`, `copy-public` (init) | `file-service` |
| `audit-app` | `php-fpm`, `nginx`, `copy-public` (init) | `audit-service` |
| `api-key-app` | `api-key-service` | `api-key-service` |
| `webhook-app` | `webhook-service` | `webhook-service` |
| `notification-app` | `php-fpm`, `nginx`, `copy-public` (init) | `notification-service` |
| `notification-consumer` | `notification-consumer` | `notification-service` |
| `template-consumer` | `template-consumer` | `template-service` |
| `template-queue` | `template-queue` | `template-service` |
| `file-consumer` | `file-consumer` | `file-service` |
| `file-queue` | `file-queue` | `file-service` |
| `audit-consumer` | `audit-consumer` | `audit-service` |
| `frontend` | `frontend` | `frontend` |

---

## Secrets Management

Secrets live in `k8s/secrets/app-secrets.yaml` (base64-encoded, committed). To update a secret value:

```bash
# Encode new value
echo -n "new-value" | base64

# Edit the secret manifest
sudo -u deploy nano /srv/dynadoc/dynadoc-flow/k8s/secrets/app-secrets.yaml

# Apply to cluster
kubectl apply -f /srv/dynadoc/dynadoc-flow/k8s/secrets/app-secrets.yaml -n dynadoc

# Restart affected deployment to pick up the change
kubectl rollout restart deployment/user-app -n dynadoc
```

---

## GHCR Pull Secret

The `dynadoc` namespace uses a `ghcr-pull-secret` for private images. It is created automatically by the CD pipeline on every deploy:

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace dynadoc \
  --docker-server=ghcr.io \
  --docker-username=<owner> \
  --docker-password=<GHCR_TOKEN> \
  --dry-run=client -o yaml | kubectl apply -f -
```

If image pulls start failing with `ImagePullBackOff`, regenerate the secret manually with a fresh `GHCR_TOKEN`.

---

## SSH Remote Setup

The VPS repo uses SSH for pushing to GitHub (avoids PAT `workflow` scope restriction):

```bash
# Verify SSH auth
sudo -u deploy ssh -T git@github.com

# Check remote
sudo -u deploy git -C /srv/dynadoc/dynadoc-flow remote -v

# Switch from HTTPS to SSH if needed
sudo -u deploy git -C /srv/dynadoc/dynadoc-flow remote set-url origin git@github.com:nteej/ddoc-k3s.git
```

---

## Kafka Topics

Managed by the `kafka-init` Job (`k8s/configmaps/kafka-init-cm.yaml`). To add a new topic, update the ConfigMap and re-run the Job:

```bash
kubectl delete job kafka-init -n dynadoc 2>/dev/null || true
kubectl apply -f /srv/dynadoc/dynadoc-flow/k8s/configmaps/kafka-init-cm.yaml -n dynadoc
kubectl apply -f /srv/dynadoc/dynadoc-flow/k8s/jobs/kafka-init-job.yaml -n dynadoc
```

Current topics: `user.logged`, `template.requested`, `template.delivered`, `audit.events`, `webhook.dispatch`, `notification.dispatch`, `notification.send`, `quota.exceeded`

---

## Versioning Convention

| Bump | When |
|------|------|
| `v*.*.PATCH` | Bug fixes, config changes, dependency updates |
| `v*.MINOR.*` | New features, new services, non-breaking changes |
| `v MAJOR.*.*` | Breaking API changes, major infrastructure changes |
