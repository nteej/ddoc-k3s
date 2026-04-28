# Step 9 — Cost and Capacity Governance

Single-node k3s on OVH; no auto-scaling exists.  
This runbook tracks resource consumption, detects saturation early, and defines the criteria for upgrading the VPS.

---

## 1. VPS Baseline Sizing

| Dimension | Current OVH model | Rationale |
|---|---|---|
| vCPU | 4 | Kafka (3 brokers + ZK), 4 Laravel workers, Kong, Redis all share the same node |
| RAM | 8 GB | Kafka JVM ~1.5 GB × 3 + Laravel/PHP-FPM ~200 MB × 4 + supporting services |
| SSD | 80 GB | OS 10 GB + PG data 15 GB + Kafka logs 10 GB + container images 20 GB + headroom |
| Bandwidth | 500 Mbps unmetered | API traffic is low-volume; uploads go to LocalStack S3 on-node |
| Monthly cost | ~€15–20 | OVH VPS 2025 model2 list price |

Update the table whenever the VPS is resized.

---

## 2. Resource Quotas per Namespace

Kubernetes `LimitRange` and `ResourceQuota` objects guard against runaway pods.

### Apply production quotas

```bash
# dynadoc namespace
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dynadoc-quota
  namespace: dynadoc
spec:
  hard:
    requests.cpu: "6"
    requests.memory: 5Gi
    limits.cpu: "8"
    limits.memory: 6Gi
    pods: "60"
EOF

# observability namespace
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: observability-quota
  namespace: observability
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 2Gi
    limits.cpu: "3"
    limits.memory: 3Gi
    pods: "20"
EOF
```

---

## 3. Weekly Capacity Snapshot

Run every Monday and paste output into the capacity log.

```bash
#!/usr/bin/env bash
# deploy/ovh/scripts/capacity-snapshot.sh

set -euo pipefail
DATE=$(date +%Y-%m-%d)

echo "=== Capacity Snapshot $DATE ==="

echo "--- Node resources ---"
kubectl top node

echo "--- Namespace totals (dynadoc) ---"
kubectl top pod -n dynadoc --sort-by=memory | head -20

echo "--- Namespace totals (observability) ---"
kubectl top pod -n observability --sort-by=memory | head -20

echo "--- Disk usage (host) ---"
df -h / /var/lib/rancher /var/lib/postgresql 2>/dev/null || df -h /

echo "--- PVC usage ---"
kubectl get pvc -A -o custom-columns=\
'NS:.metadata.namespace,NAME:.metadata.name,CAPACITY:.spec.resources.requests.storage,STATUS:.status.phase'

echo "--- Kafka disk (broker pods) ---"
for pod in $(kubectl get pods -n dynadoc -l app=kafka -o name); do
  echo "  $pod:"
  kubectl exec -n dynadoc "$pod" -- df -h /var/lib/kafka/data 2>/dev/null || true
done

echo "--- OOM kills (last 24 h) ---"
kubectl get events -A --field-selector reason=OOMKilling \
  --sort-by='.lastTimestamp' 2>/dev/null | tail -10 || echo "none"
```

```bash
chmod +x deploy/ovh/scripts/capacity-snapshot.sh
```

Automate with a weekly cron on the VPS:

```bash
# /etc/cron.d/dynadoc-capacity
0 8 * * 1 root /opt/dynadoc/capacity-snapshot.sh >> /var/log/dynadoc/capacity.log 2>&1
```

---

## 4. Saturation Thresholds and Response

| Metric | Warning | Critical | Response |
|---|---|---|---|
| Node CPU (1 min avg) | > 70 % | > 85 % | Profile top pod; scale replicas down or defer batch jobs |
| Node RAM used | > 75 % | > 90 % | Identify leaking pod; restart; plan VPS upgrade |
| Root disk | > 65 % | > 80 % | Purge old container images; trim Kafka retention |
| Kafka broker disk | > 60 % | > 75 % | Reduce `log.retention.hours`; add log-compaction |
| PVC (PostgreSQL) | > 70 % | > 85 % | Increase PVC size or archive old data |
| Grafana Loki disk | > 60 % | > 80 % | Reduce `retention_period` in Loki config |

### Prometheus alert rules

Add to your Prometheus `rules/` ConfigMap:

```yaml
groups:
  - name: capacity
    rules:
      - alert: NodeCPUHigh
        expr: 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node CPU above 70% for 10 min"

      - alert: NodeMemoryHigh
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 75
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node memory above 75%"

      - alert: DiskSpaceHigh
        expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 65
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Root disk above 65%"
```

---

## 5. Image and Registry Housekeeping

Untagged and stale images accumulate quickly on a single node.

```bash
# Remove dangling images on the node (run monthly or when disk > 60%)
ssh root@<vps-ip> "k3s ctr images ls | grep '<none>' | awk '{print \$1}' | xargs -r k3s ctr images rm"

# Prune images not referenced by any running container
ssh root@<vps-ip> "k3s crictl rmi --prune"
```

GHCR retention — keep last 10 tags per image, delete older ones via the GitHub UI or API:

```bash
# List package versions (requires GHCR_PAT with delete:packages scope)
gh api -X GET /user/packages/container/dynadoc-user-service/versions \
  --paginate | jq '.[].id'
```

---

## 6. Kafka Retention Tuning

Default retention is 168 h (7 days).  For a single-node demo the disk budget is tight.

```bash
# Reduce retention to 48 h for all app topics
for topic in user-events template-events file-events audit-events; do
  kubectl exec -n dynadoc kafka-0 -- \
    kafka-configs.sh --bootstrap-server localhost:9092 \
    --entity-type topics --entity-name "$topic" \
    --alter --add-config retention.ms=172800000
done

# Verify
kubectl exec -n dynadoc kafka-0 -- \
  kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name audit-events --describe
```

---

## 7. PostgreSQL Storage Growth

```bash
# Size of each database (run inside any app pod or psql container)
kubectl exec -n dynadoc deploy/user-service -- \
  php artisan tinker --execute="DB::select('SELECT pg_size_pretty(pg_database_size(current_database())) AS size');"

# Or directly against the postgres pod
kubectl exec -n dynadoc postgres-user-0 -- \
  psql -U postgres -c "\l+" 2>/dev/null | grep -E 'Name|Size'
```

Archive policy — tables with unbounded growth:

| Table | Service | Archive after | Action |
|---|---|---|---|
| `audit_logs` | audit-service | 90 days | `DELETE WHERE created_at < NOW() - INTERVAL '90 days'` |
| `document_versions` | file-service | 180 days | Move to cold storage or delete |
| `failed_jobs` | all | 30 days | Truncate periodically |

Add monthly cron jobs to each app database using a Kubernetes `CronJob` manifest.

---

## 8. VPS Upgrade Decision Criteria

Trigger a VPS upgrade when **two or more** of these are true for 7 consecutive days:

- Node CPU warning fires > 3 × per day
- Node RAM > 80 % after a fresh restart
- Any PostgreSQL PVC crosses 70 %
- p95 API latency on Kong > 800 ms (Grafana → Explore → Tempo)
- Kafka consumer lag > 50 k messages on any topic

### Upgrade path

| Current | Upgrade to | Δ cost/mo | Trigger |
|---|---|---|---|
| OVH VPS model2 (4 vCPU / 8 GB) | VPS model3 (6 vCPU / 16 GB) | +€10–15 | RAM saturation |
| VPS model3 | Dedicated Cloud / Bare-metal | +€50+ | CPU saturation or HA need |

To resize with OVH: stop the VPS from the OVH Control Panel → select new plan → reboot. The disk and IP are preserved.  
Re-run `02-vps-bootstrap.md` to verify k3s and firewall rules after the resize.

---

## 9. Monthly Cost Review Checklist

Perform on the first Monday of each month.

- [ ] Pull capacity snapshot (`deploy/ovh/scripts/capacity-snapshot.sh`) and compare with last month
- [ ] Check OVH invoice against expected €15–20/mo; investigate anomalies
- [ ] Verify Prometheus alert rules fired vs. threshold table — are thresholds still appropriate?
- [ ] Review GHCR package storage — prune stale image tags
- [ ] Check Kafka topic sizes; adjust retention if disk > 50 %
- [ ] Check PostgreSQL PVC sizes; run archive queries if tables > 5 GB
- [ ] Review Loki log volume (Grafana → Explore → Loki → `{job="dynadoc"} | rate()`)
- [ ] Decide whether any upgrade criterion (§8) is approaching
- [ ] Update the baseline sizing table (§1) if the VPS was changed
- [ ] Log findings in `deploy/ovh/capacity-log.md` with date and signature

---

## 10. Capacity Log Template

Create `deploy/ovh/capacity-log.md` and append an entry after each review:

```markdown
## YYYY-MM-DD

Reviewer: <name>

| Metric | Value | vs. last month | Status |
|---|---|---|---|
| Node CPU avg | % | ±% | OK / WARN |
| Node RAM used | GB / 8 GB | ±GB | OK / WARN |
| Root disk | GB / 80 GB | ±GB | OK / WARN |
| Kafka disk | GB | ±GB | OK / WARN |
| PG total size | GB | ±GB | OK / WARN |
| OVH invoice | €X | ±€ | OK |

Notes: …

Actions taken: …
```
