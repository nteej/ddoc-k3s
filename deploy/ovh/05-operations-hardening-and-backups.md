# Step 5: Operations, Hardening, And Backups

This step starts after the first successful production rollout.

Objectives:

- keep services stable
- reduce security risk
- make recovery repeatable

## 1. Security hardening checklist

Host:

1. Keep only ports 22, 80, 443 open to internet.
2. Restrict SSH to your admin IP.
3. Keep password auth disabled and SSH keys only.
4. Enable unattended security updates.
5. Enable fail2ban.

Kubernetes:

1. Keep Kong Admin API private.
2. Do not expose Postgres, Redis, Kafka, Zookeeper as public services.
3. Rotate app and DB secrets quarterly.
4. Rotate JWT keypair when security policy requires.

Runtime policy:

1. Set `APP_DEBUG=false` for all services.
2. Keep production images pinned by immutable tag.
3. Avoid using `latest` for rollback decisions.

## 2. Backup policy

Minimum schedule:

1. Daily: logical backups of all PostgreSQL databases.
2. Daily: backup LocalStack data directory if demo artifacts matter.
3. Daily: backup Kubernetes manifests and secrets source files from private secure storage.
4. Weekly: full restore validation on a staging node.

Recommended retention:

1. Daily backups: 14 days.
2. Weekly backups: 8 weeks.
3. Monthly backups: 6 months.

## 3. PostgreSQL backup commands

Run from VPS:

```bash
mkdir -p /srv/backups/pg/$(date +%F)

kubectl exec -n dynadoc statefulset/user-db -- sh -c 'pg_dump -U postgres user_service' > /srv/backups/pg/$(date +%F)/user_service.sql
kubectl exec -n dynadoc statefulset/template-db -- sh -c 'pg_dump -U postgres template_service' > /srv/backups/pg/$(date +%F)/template_service.sql
kubectl exec -n dynadoc statefulset/file-db -- sh -c 'pg_dump -U postgres file_service' > /srv/backups/pg/$(date +%F)/file_service.sql
kubectl exec -n dynadoc statefulset/audit-db -- sh -c 'pg_dump -U postgres audit_service' > /srv/backups/pg/$(date +%F)/audit_service.sql
kubectl exec -n dynadoc statefulset/kong-db -- sh -c 'pg_dump -U kong kong' > /srv/backups/pg/$(date +%F)/kong.sql
```

Compress and checksum:

```bash
tar -czf /srv/backups/pg/pg-$(date +%F).tar.gz -C /srv/backups/pg $(date +%F)
sha256sum /srv/backups/pg/pg-$(date +%F).tar.gz > /srv/backups/pg/pg-$(date +%F).sha256
```

## 4. Restore drill (mandatory)

Perform weekly in non-production first:

1. Create fresh test namespace.
2. Restore one SQL dump into matching database.
3. Run basic query checks.
4. Run one login and one document generation smoke test.

Example restore flow:

```bash
cat /srv/backups/pg/2026-04-25/user_service.sql | kubectl exec -i -n dynadoc statefulset/user-db -- psql -U postgres -d user_service
```

## 5. Monitoring and alert baselines

Create Grafana alerts for:

1. pod restart spikes in dynadoc namespace
2. Kafka broker down
3. Redis unavailable
4. Postgres unavailable
5. high 5xx at Kong
6. high p95 latency for user, template, file services

Minimum SLO targets for demo stability:

1. API availability: 99.5%
2. Login p95: < 500ms
3. Generate request acceptance p95: < 800ms
4. critical service restart rate: near zero under normal load

## 6. Routine operating cadence

Daily:

1. `make status`
2. check Grafana red panels
3. check backup job success

Weekly:

1. review disk usage and inode usage
2. run restore drill
3. review failed pods and events

Monthly:

1. patch OS packages and reboot in maintenance window
2. rotate secrets according to policy
3. test rollback with last known good tag

## 7. Incident playbook (quick path)

1. Identify failed layer: ingress, app, worker, data, or observability.
2. Check pods and recent events.
3. If release-related, rollback affected services by previous tag.
4. If data-related, isolate writes and validate backup integrity.
5. Record root cause and update this runbook.

Core commands:

```bash
kubectl get pods -n dynadoc
kubectl get events -n dynadoc --sort-by=.metadata.creationTimestamp | tail -n 50
make logs-user
make logs-template
make logs-file
make logs-audit
```

## 8. Exit criteria for stable production-demo state

1. Backups are running daily and checksummed.
2. Restore drill completed successfully at least once.
3. Grafana alerts configured and tested.
4. Rollback tested with one prior release tag.
5. Security checklist completed and documented.