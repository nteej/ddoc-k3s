# Step 7: Incident Response And Disaster Recovery Runbook

This runbook defines how to detect, triage, communicate, contain, recover, and review incidents for the single-node OVH deployment of DynaDoc Flow.

## 1. Scope and assumptions

Scope:

1. Kubernetes workloads in dynadoc and observability namespaces
2. Host services such as nginx and k3s
3. Data stores: user-db, template-db, file-db, audit-db, kong-db, redis, kafka, localstack
4. Public endpoints: ddoc.fi, api.ddoc.fi, grafana.ddoc.fi

Assumptions:

1. Backups and restore drills are implemented as defined in Step 5
2. Release process follows Step 6 approval and rollback policy
3. At least one operator has SSH and kubectl access during incidents

## 2. Incident severity levels

Severity 1:

1. Full production outage
2. Data loss or suspected security compromise
3. RTO target: 60 minutes

Severity 2:

1. Partial outage of core user journey
2. Sustained high error rate or severe latency degradation
3. RTO target: 4 hours

Severity 3:

1. Non-critical degradation with workaround
2. Isolated component instability without user-facing outage
3. RTO target: next maintenance window

## 3. Roles during incidents

Incident Commander:

1. Owns decision making
2. Sets incident severity
3. Approves containment and recovery path

Operations Lead:

1. Executes host and cluster changes
2. Collects timeline and command output

Application Lead:

1. Validates service behavior and business flows
2. Confirms recovery with smoke tests

Communications Owner:

1. Maintains stakeholder updates
2. Publishes start, impact, workaround, recovery, closure notes

## 4. Detection and alert triggers

Primary triggers:

1. Grafana critical panel alert
2. High 5xx from Kong
3. Pod crash loops in dynadoc namespace
4. Database or Kafka unavailability
5. Manual report from users

Immediate checks:

1. kubectl get pods -n dynadoc
2. kubectl get pods -n observability
3. kubectl get events -n dynadoc --sort-by=.metadata.creationTimestamp | tail -n 100
4. curl -I https://ddoc.fi
5. curl -I https://api.ddoc.fi

## 5. First 15 minutes triage flow

1. Assign Incident Commander and severity
2. Start incident timeline log with timestamps
3. Identify blast radius
4. Freeze non-essential production changes
5. Decide path: rollback, component restart, or data restore
6. Publish first status update

## 6. Containment actions by failure type

Release regression:

1. Shift traffic away from canary if active
2. Roll back to previous tag using Makefile rollback commands
3. Verify auth, template generation, file retrieval, and audit write

Database failure:

1. Stop write-heavy operations if corruption is suspected
2. Capture database pod logs and disk state
3. Restore latest valid backup to replacement database workload

Kafka failure:

1. Check zookeeper and all kafka pods readiness
2. Restore broker availability before restarting consumers
3. Verify consumer lag after recovery

Redis failure:

1. Restart redis deployment if transient
2. Validate session behavior and queue processing

Ingress and routing failure:

1. Validate host nginx service state
2. Validate kong deployment and kong-init status
3. Reapply Kong init job if routes or plugins are missing

## 7. Disaster recovery scenarios

Scenario A: Single node or host loss

1. Provision replacement OVH VPS
2. Re-run Step 2 bootstrap
3. Re-apply secrets and config from private source of truth
4. Deploy last known good release tag
5. Restore databases from latest successful backup
6. Validate public endpoints and smoke tests

Scenario B: Data corruption in one service database

1. Isolate affected service writes
2. Restore only the affected database from backup
3. Run service-specific migration validation
4. Confirm cross-service integrations are healthy

Scenario C: Registry or image pull outage

1. Use pre-pulled or cached images if available
2. Pause new deployments
3. Maintain current stable release until registry is healthy

Scenario D: Secret or key compromise

1. Rotate compromised credentials immediately
2. Reissue JWT keypair and update Kong public key
3. Redeploy affected services
4. Force re-authentication if token trust boundary is affected

## 8. Recovery validation checklist

Infrastructure:

1. All critical pods are running and ready
2. No crash loops in dynadoc namespace
3. Database and Kafka health checks pass

Functional:

1. Login flow works
2. Template create and generate works
3. File appears and can be downloaded
4. Audit records are created for login and generation

Observability:

1. Grafana dashboards return to baseline
2. No sustained high 5xx from Kong
3. Latency and restart metrics normalize

## 9. Recovery command set

Status and events:

1. kubectl get pods -n dynadoc
2. kubectl get svc -n dynadoc
3. kubectl get events -n dynadoc --sort-by=.metadata.creationTimestamp | tail -n 100

Rollout and rollback:

1. make rollout-user
2. make rollout-template
3. make rollout-file
4. make rollout-audit
5. make rollout-frontend
6. make rollback-user
7. make rollback-template
8. make rollback-file
9. make rollback-audit
10. make rollback-frontend

Kong re-init:

1. kubectl delete job kong-init -n dynadoc --ignore-not-found
2. kubectl apply -f k8s/infra/kong-init-job.yaml
3. kubectl wait --for=condition=complete job/kong-init -n dynadoc --timeout=180s

Database restore example:

1. cat /srv/backups/pg/<date>/user_service.sql | kubectl exec -i -n dynadoc statefulset/user-db -- psql -U postgres -d user_service

## 10. Communications template

Incident start:

1. issue detected at <time>
2. current impact summary
3. severity assignment
4. next update ETA

Progress update:

1. actions completed
2. current risk and impact
3. next action
4. next update ETA

Closure update:

1. services recovered at <time>
2. validation completed
3. residual risk if any
4. postmortem schedule

## 11. Post-incident review requirements

Complete within 48 hours:

1. root cause statement
2. timeline with decision points
3. what worked and what failed
4. preventive actions with owners and due dates
5. runbook updates in this Step 7 document

## 12. RTO and RPO targets for this setup

Targets:

1. Severity 1 RTO: 60 minutes
2. Severity 2 RTO: 4 hours
3. Database RPO: up to 24 hours unless backup frequency increases

To reduce RPO:

1. increase backup cadence for critical databases
2. ship backups off-host immediately after creation

## 13. Exit criteria for DR readiness

1. one full host-loss tabletop completed
2. one real restore drill completed from latest backups
3. rollback exercise completed for previous release tag
4. incident communication templates approved and stored
5. this runbook reviewed quarterly