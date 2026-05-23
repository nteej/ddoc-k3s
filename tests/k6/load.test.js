/**
 * Load Test — 7 minutes total, up to 25 VUs
 *
 * Two concurrent scenarios:
 *   browse — 20 VUs simulating users reading templates/contexts/files
 *   write  — 5 VUs creating and immediately deleting contexts
 *
 * WARNING: This runs against the live BASE_URL. Default is production.
 * Point at a staging environment when possible:
 *   BASE_URL=https://staging.ddoc.fi/api make test-load
 *
 *   TEST_EMAIL=admin@example.com TEST_PASSWORD=secret k6 run tests/k6/load.test.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, JSON_HEADERS, THRESHOLDS_LOAD } from './config.js';
import { login, logout, randomBetween } from './lib/auth.js';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      exec: 'browseScenario',
      gracefulRampDown: '30s',
    },
    write: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '4m', target: 5 },
        { duration: '1m', target: 0 },
      ],
      exec: 'writeScenario',
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS_LOAD,
};

// ── Browse scenario ───────────────────────────────────────────────────────────
// Simulates a logged-in user paging through the UI: templates, contexts, files.
export function browseScenario() {
  const loginRes = login(TEST_EMAIL, TEST_PASSWORD);
  if (loginRes.status !== 200) {
    sleep(2);
    return;
  }

  group('browse', () => {
    const reads = [
      `${BASE_URL}/templates/filters?page=1&perPage=20`,
      `${BASE_URL}/contexts/filters?page=1&perPage=20`,
      `${BASE_URL}/tags/filters?page=1&perPage=20`,
      `${BASE_URL}/files/filters?page=1&perPage=20`,
      `${BASE_URL}/auth/me`,
      `${BASE_URL}/organizations/current`,
      `${BASE_URL}/notifications?limit=10&offset=0`,
      `${BASE_URL}/notifications/unread-count`,
    ];

    for (const url of reads) {
      const res = http.get(url);
      check(res, { 'browse: 200': (r) => r.status === 200 });
      sleep(randomBetween(0.5, 2.0));
    }
  });

  logout();
  sleep(randomBetween(1, 3));
}

// ── Write scenario ────────────────────────────────────────────────────────────
// Simulates editor-level write traffic: create context → list → delete context.
export function writeScenario() {
  const loginRes = login(TEST_EMAIL, TEST_PASSWORD);
  if (loginRes.status !== 200) {
    sleep(2);
    return;
  }

  group('write', () => {
    const name = `[LOAD-TEST] ctx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const createRes = http.post(
      `${BASE_URL}/contexts`,
      JSON.stringify({ name, description: 'k6 load test — safe to delete' }),
      { headers: JSON_HEADERS }
    );
    check(createRes, { 'context create: 201': (r) => r.status === 201 });

    if (createRes.status === 201) {
      const contextId = createRes.json('data');
      sleep(randomBetween(0.3, 1.0));

      // Read back to simulate realistic round-trip
      const listRes = http.get(`${BASE_URL}/contexts/filters?page=1&perPage=5`);
      check(listRes, { 'context list after write: 200': (r) => r.status === 200 });

      sleep(0.3);

      const deleteRes = http.del(`${BASE_URL}/contexts/${contextId}`);
      check(deleteRes, { 'context delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }
  });

  logout();
  sleep(randomBetween(2, 5));
}
