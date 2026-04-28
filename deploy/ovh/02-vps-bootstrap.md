# Step 2: OVH VPS Bootstrap And Cluster Bring-Up

Target platform:

- Ubuntu 24.04 LTS preferred
- Ubuntu 25.04 acceptable if you explicitly want the newer release and accept the shorter support window
- `8 vCPU`, `24 GB RAM`, `250 GB NVMe` minimum for the full employer-demo stack

## 1. Base OS hardening

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx curl git jq unzip ufw fail2ban
sudo timedatectl set-timezone Europe/Helsinki
sudo adduser deploy
sudo usermod -aG sudo deploy
```

Copy your SSH key to the `deploy` user, then lock SSH down:

```bash
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

Enable the firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <YOUR_ADMIN_IP> to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Install `k3s`

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
sudo systemctl enable k3s
sudo systemctl status k3s --no-pager
kubectl get nodes -o wide
```

`k3s` already includes `containerd`, so you do not need Docker on the VPS for runtime.

## 3. Prepare the repo and kubeconfig access

```bash
sudo mkdir -p /srv/dynadoc
sudo chown deploy:deploy /srv/dynadoc
cd /srv/dynadoc
git clone <YOUR_REPO_URL> dynadoc-flow
cd dynadoc-flow
kubectl config current-context
```

## 4. Prepare production manifests

Replace placeholder secret values before any apply:

- `k8s/secrets/app-secrets.yaml`
- `k8s/secrets/db-secrets.yaml`
- `k8s/secrets/kong-jwt-secret.yaml`

Then replace the local Kong CORS bootstrap config with the production variant:

```bash
cp deploy/ovh/k8s/kong-init-cm.ddoc.fi.yaml k8s/configmaps/kong-init-cm.yaml
```

## 5. Build and push images

Run this from your workstation or CI using GHCR:

```bash
export REGISTRY=ghcr.io/<github-owner>/dynadoc
export TAG=$(git rev-parse --short HEAD)
make push
```

Confirm that these images exist in the registry:

- `user-service`
- `template-service`
- `file-service`
- `audit-service`
- `frontend`

## 6. Deploy the cluster on the OVH VPS

From the VPS:

```bash
export REGISTRY=ghcr.io/<github-owner>/dynadoc
export TAG=<image-tag>
make deploy
```

Deployment order is already encoded in `k8s/deploy.sh`:

1. namespaces
2. secrets and configmaps
3. databases and Redis
4. Zookeeper, Kafka, and topic init
5. app services
6. consumers and queue workers
7. Kong and Kong bootstrap job
8. frontend and LocalStack
9. observability stack

## 7. Install the public reverse proxy

Apply the host Nginx config from `01-host-proxy.md`, then request TLS certificates.

## 8. Post-deploy verification

Cluster checks:

```bash
kubectl get pods -n dynadoc
kubectl get pods -n observability
kubectl get svc -n dynadoc
kubectl get svc -n observability
```

Public checks:

```bash
curl -I https://ddoc.fi
curl -I https://api.ddoc.fi/api/auth/login
curl -I https://grafana.ddoc.fi
```

Rollout checks:

```bash
kubectl rollout status deployment/user-app -n dynadoc
kubectl rollout status deployment/template-app -n dynadoc
kubectl rollout status deployment/file-app -n dynadoc
kubectl rollout status deployment/audit-app -n dynadoc
kubectl rollout status deployment/frontend -n dynadoc
kubectl rollout status deployment/kong -n dynadoc
```