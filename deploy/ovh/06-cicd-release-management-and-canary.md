# Step 6: CI/CD Release Management With Approval Gates And Canary Rollout

This step defines how releases move from source control to production on the same OVH single-node k3s setup.

Scope:

1. GitHub-based CI and CD controls
2. manual approval gates before production deploy
3. canary-style rollout for API services behind Kong
4. promotion and rollback standards

## 1. Release model

Use a tag-driven release model.

1. Merge to main branch after CI passes.
2. Create immutable release tag, for example `v2026.04.25-01`.
3. Build and push all service images with the same tag.
4. Deploy that exact tag in production.

Rules:

1. never deploy mutable `latest` as release source of truth
2. every deployment must reference one immutable tag
3. rollback always targets a previous known-good immutable tag

## 2. CI pipeline requirements

CI must block merge unless all required checks pass.

Minimum CI gates:

1. backend unit and integration tests
2. frontend lint and build
3. container image build validation for all services
4. dependency vulnerability scan
5. static checks for Kubernetes manifests

Recommended CI artifacts:

1. image digest list per service
2. SBOM per image
3. test reports and coverage snapshot

## 3. CD pipeline with approval gates

Use at least two approval checkpoints.

Gate A: Release readiness approval

1. verify CI success for the release tag
2. verify images exist in registry for all services
3. verify secrets status and migration impact

Gate B: Production deployment approval

1. manual approver confirms maintenance window
2. rollback tag is pre-selected
3. canary plan and stop conditions are recorded

For GitHub Actions environments:

1. use environment `production`
2. require reviewer approval
3. restrict deployment branch and tag patterns

## 4. Required deployment metadata

Each release must include:

1. release tag
2. git commit sha
3. image digests for user, template, file, audit, frontend
4. migration plan and rollback impact
5. canary target service list

Store this as a release note in the repository and in deployment logs.

## 5. Canary strategy for this OVH topology

Because this is a single-node cluster, use canary-style traffic shaping at the gateway layer, not infrastructure scaling across nodes.

Model:

1. deploy canary workload for one service at a time
2. keep stable workload unchanged
3. route limited traffic to canary via Kong upstream target weights
4. evaluate error rate and latency
5. promote or rollback

Service order:

1. user-service
2. template-service
3. file-service
4. audit-service
5. frontend last

## 6. Canary execution flow (per service)

Example for one service release:

1. deploy canary version with suffix deployment name
2. register canary target in Kong upstream with low weight
3. keep stable target with high weight
4. run smoke tests and watch telemetry
5. increase canary weight in small steps
6. promote to full traffic only if gates pass

Suggested traffic steps:

1. 5 percent for 10 minutes
2. 20 percent for 15 minutes
3. 50 percent for 20 minutes
4. 100 percent and remove old target

Stop conditions:

1. 5xx rate above baseline threshold
2. p95 latency regression above threshold
3. auth failures spike
4. consumer lag growth indicating downstream instability

## 7. Promotion criteria

Promote canary only when all are true:

1. no critical alerts during canary window
2. no sustained 5xx increase
3. p95 latency within accepted variance
4. business smoke tests pass
5. logs show no new critical exceptions

Then:

1. rollout stable deployment to release tag
2. set Kong routing to stable only
3. remove canary deployment

## 8. Rollback criteria and fast rollback path

Trigger rollback immediately if any stop condition persists more than short observation window.

Fast rollback procedure:

1. set Kong target weight for canary to zero
2. route all traffic to stable target
3. if stable was already replaced, deploy previous tag via Makefile rollout commands
4. verify recovery checks and close incident

Use these existing commands from current repo workflow:

1. `make rollout-user`
2. `make rollout-template`
3. `make rollout-file`
4. `make rollout-audit`
5. `make rollout-frontend`
6. `make rollback-user`
7. `make rollback-template`
8. `make rollback-file`
9. `make rollback-audit`
10. `make rollback-frontend`

## 9. Observability gates during canary

Monitor at minimum:

1. Kong response status distribution
2. service pod restarts
3. service p95 latency
4. Kafka consumer lag for template, file, audit consumers
5. Postgres error logs and connection saturation

If any critical panel turns red, pause progression and decide promote versus rollback.

## 10. Suggested GitHub Actions workflow structure

Pipeline stages:

1. ci stage on pull request
2. build and push stage on release tag
3. pre-prod validation stage
4. manual approval gate
5. canary deployment stage
6. canary verification stage
7. promotion stage
8. post-deploy verification and release summary

Keep deployment logic idempotent and rerunnable.

## 11. Production release checklist template

Before deploy:

1. release tag created
2. CI green
3. image digests recorded
4. rollback tag identified
5. approver assigned

During deploy:

1. canary enabled for target service
2. telemetry monitored at each step
3. promotion decision logged

After deploy:

1. full smoke test passed on `ddoc.fi`
2. audit trail verified for release window
3. release note updated with outcome and timings

## 12. Exit criteria for mature release process

1. every production deployment uses immutable tag and approval gate
2. canary executed for every API service release
3. rollback drills are successful and timed
4. release metrics and incident outcomes are captured per deployment