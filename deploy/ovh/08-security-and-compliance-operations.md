# Step 8: Security And Compliance Operations Runbook

This runbook defines the recurring security and compliance controls for the single-server OVH production setup.

Goals:

1. enforce least-privilege access
2. rotate secrets and keys on a predictable cadence
3. preserve auditable evidence for employer-facing reviews
4. run quarterly control checks with owners and sign-off

## 1. Scope and control boundary

In scope:

1. OVH VPS host access and OS controls
2. k3s cluster access and workload controls
3. application and infrastructure secrets
4. release and rollback permissions
5. runtime evidence from logs, metrics, traces, and audit tables

Out of scope:

1. end-user endpoint security
2. third-party SaaS internals outside your admin control

## 2. Access control model

Principles:

1. least privilege
2. separation of duties
3. short-lived elevated access when possible
4. full traceability of admin actions

Role model:

1. Platform Admin: host, k3s, networking, backup and restore operations
2. Release Approver: approve production deployment gates only
3. Application Operator: read-only observability and service-level diagnostics
4. Auditor Reviewer: read-only evidence access

Minimum controls:

1. SSH key-only login, no password authentication
2. root login disabled
3. sudo access granted only to named operator users
4. production deployment requires explicit approval gate
5. all admin users listed in a single source of truth document

## 3. Authentication and authorization controls

Host controls:

1. enforce key-based SSH only
2. restrict SSH source IP where practical
3. enable fail2ban and unattended security updates

Cluster controls:

1. keep kubeconfig access limited to operators
2. avoid distributing broad cluster-admin credentials
3. use namespace-scoped access where possible

Gateway controls:

1. Kong Admin API must remain private
2. protected API routes must require valid JWT
3. CORS origin must remain aligned to https://ddoc.fi

## 4. Secret inventory and ownership

Mandatory inventory fields for each secret:

1. secret name
2. purpose
3. owner
4. storage location
5. rotation frequency
6. last rotated date
7. next rotation date

Minimum secret sets to track:

1. app keys for user, template, file, audit services
2. postgres passwords for user-db, template-db, file-db, audit-db, kong-db
3. Kong JWT public key and corresponding private signing key lifecycle
4. registry pull credentials
5. optional SMTP credentials if enabled

## 5. Secret rotation calendar

Recommended cadence:

1. every 30 days: registry credentials and optional SMTP credentials
2. every 90 days: database passwords and app keys
3. every 180 days: JWT signing keypair rotation with planned user re-authentication window
4. immediate: any secret suspected compromised

Rotation workflow:

1. generate replacement secret
2. update private secret source of truth
3. apply rotated secret to cluster
4. restart only affected workloads in controlled order
5. run smoke tests
6. record rotation evidence and sign-off

## 6. Evidence collection standard

Collect and retain evidence for each month and each production release.

Required evidence categories:

1. access evidence: admin user list, SSH config state, sudoers changes
2. release evidence: approved deployment gate, release tag, image digests
3. operational evidence: health snapshots, backup success logs, restore drill proof
4. security evidence: secret rotation records, vulnerability scan results
5. incident evidence: timelines, decisions, recovery validation, postmortems

Recommended evidence path layout:

1. /srv/compliance-evidence/YYYY/MM/access
2. /srv/compliance-evidence/YYYY/MM/releases
3. /srv/compliance-evidence/YYYY/MM/operations
4. /srv/compliance-evidence/YYYY/MM/security
5. /srv/compliance-evidence/YYYY/MM/incidents

## 7. Monthly security operations checklist

1. verify host patch status and reboot status
2. verify firewall rules still match approved policy
3. verify no unintended public NodePort exposure
4. verify secrets due this month were rotated
5. verify backup jobs succeeded and checksums are present
6. verify at least one restore validation was executed in period
7. export key Grafana snapshots for service health baseline
8. archive monthly evidence set

## 8. Quarterly control checklist

Quarterly controls must be reviewed and signed off by Platform Admin and one independent reviewer.

Access and identity:

1. review all VPS users and remove stale accounts
2. rotate any stale SSH keys
3. confirm release approver list is current

Secrets and key management:

1. verify rotation calendar adherence
2. verify no default credentials remain
3. verify JWT key lifecycle status against policy

Infrastructure and network:

1. verify only 22, 80, 443 are publicly reachable
2. verify internal services are not externally exposed
3. verify Kong Admin endpoint remains private

Data resilience:

1. execute full restore drill from latest backup chain
2. document actual RTO and compare to target
3. validate backup retention policy compliance

Release process integrity:

1. sample at least one deployment and verify approval evidence
2. verify immutable tag usage for all recent production deployments
3. verify rollback drill success in quarter

## 9. Compliance artifacts and retention

Retention baseline:

1. release and approval evidence: 12 months
2. backup and restore evidence: 12 months
3. incident records and postmortems: 24 months
4. access review and quarterly checklist sign-offs: 24 months

If policy requires longer retention, follow stricter requirement.

## 10. Audit evidence collection playbook

For each production release:

1. capture release tag and commit sha
2. capture image digest list
3. capture approval gate timestamp and approver identity
4. capture post-deploy smoke test result summary
5. capture rollback readiness confirmation

For each incident:

1. severity and start time
2. impact statement and affected services
3. decision log and recovery actions
4. recovery validation proof
5. postmortem and preventive actions

## 11. Non-conformance handling

When a control fails:

1. log non-conformance with date, owner, and impact
2. apply immediate containment action
3. define corrective action with due date
4. verify closure and attach evidence

## 12. Step 8 exit criteria

1. access control roles and owners documented
2. secret rotation calendar active and tracked
3. monthly evidence archive path in use
4. quarterly checklist executed with sign-off
5. at least one audit evidence package assembled end-to-end