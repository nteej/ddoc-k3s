#!/usr/bin/env bash
# Usage: ./tests/run.sh <suite> [options passed to k6]
#
# Suites:
#   smoke       — 1 VU, ~30s, checks all services are reachable
#   regression  — 1 VU, 1 iteration, full CRUD coverage with cleanup
#   load        — 25 VUs, 7 min, realistic read + write traffic
#
# Environment variables (all optional with defaults):
#   BASE_URL      Base URL of the API  (default: https://ddoc.fi/api)
#   TEST_EMAIL    Test account email   (default: admin@example.com)
#   TEST_PASSWORD Test account password (required for regression + load)
#
# Examples:
#   ./tests/run.sh smoke
#   TEST_PASSWORD=secret ./tests/run.sh regression
#   BASE_URL=https://staging.ddoc.fi/api TEST_PASSWORD=secret ./tests/run.sh load

set -euo pipefail

SUITE="${1:-smoke}"
shift || true

DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$DIR/k6/${SUITE}.test.js"

if [[ ! -f "$SCRIPT" ]]; then
  echo "ERROR: Unknown suite '$SUITE'. Available: smoke, regression, load" >&2
  exit 1
fi

export BASE_URL="${BASE_URL:-https://ddoc.fi/api}"
export TEST_EMAIL="${TEST_EMAIL:-admin@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-}"

if [[ -z "$TEST_PASSWORD" && "$SUITE" != "smoke" ]]; then
  echo "ERROR: TEST_PASSWORD is required for the '$SUITE' suite" >&2
  echo "  export TEST_PASSWORD=your-password" >&2
  exit 1
fi

if [[ "$SUITE" == "load" ]]; then
  echo "================================================================"
  echo "  LOAD TEST — targeting: $BASE_URL"
  echo "  This will generate significant traffic. Press Ctrl+C to abort."
  echo "================================================================"
  sleep 5
fi

echo "Running $SUITE tests against $BASE_URL..."
k6 run "$SCRIPT" "$@"
