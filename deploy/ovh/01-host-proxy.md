# Step 1: Host Reverse Proxy For `ddoc.fi`

Use host-level Nginx on the OVH VPS. Do not expose Kubernetes `NodePort` services directly to the internet.

DNS records:

- `A ddoc.fi -> <OVH_VPS_PUBLIC_IP>`
- `A www.ddoc.fi -> <OVH_VPS_PUBLIC_IP>`
- `A api.ddoc.fi -> <OVH_VPS_PUBLIC_IP>`
- `A grafana.ddoc.fi -> <OVH_VPS_PUBLIC_IP>`

Public routing:

- `https://ddoc.fi` -> `127.0.0.1:30573`
- `https://www.ddoc.fi` -> `127.0.0.1:30573`
- `https://api.ddoc.fi` -> `127.0.0.1:30800`
- `https://grafana.ddoc.fi` -> `127.0.0.1:30300`

Install the host config:

```bash
sudo cp deploy/ovh/nginx/ddoc.fi.conf /etc/nginx/sites-available/ddoc.fi
sudo ln -s /etc/nginx/sites-available/ddoc.fi /etc/nginx/sites-enabled/ddoc.fi
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificates after DNS resolves:

```bash
sudo certbot --nginx -d ddoc.fi -d www.ddoc.fi -d api.ddoc.fi -d grafana.ddoc.fi
```

Firewall policy:

- allow `22/tcp` only from your admin IP
- allow `80/tcp` and `443/tcp` from anywhere
- deny public access to `30573`, `30800`, `30843`, `30300`, `30566`
- deny public access to Postgres, Redis, Kafka, Zookeeper, and Kong admin ports

Validation:

```bash
curl -I http://127.0.0.1:30573
curl -I http://127.0.0.1:30800
curl -I http://127.0.0.1:30300
```