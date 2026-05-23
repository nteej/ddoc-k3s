/**
 * Smoke Test — ~30 seconds, 1 VU
 *
 * Verifies every service is reachable and responding correctly.
 * Safe to run against production at any time.
 *
 *   k6 run tests/k6/smoke.test.js
 *   BASE_URL=https://ddoc.fi/api TEST_EMAIL=... TEST_PASSWORD=... k6 run tests/k6/smoke.test.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, THRESHOLDS_SMOKE } from './config.js';
import { login, logout } from './lib/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: THRESHOLDS_SMOKE,
};

export default function () {
  // ── Health (no auth) ──────────────────────────────────────────────────
  group('health', () => {
    const res = http.get(`${BASE_URL}/health/system`);
    check(res, {
      'health: 200': (r) => r.status === 200,
      'health: under 1s': (r) => r.timings.duration < 1000,
    });
  });

  sleep(0.5);

  // ── Authentication ────────────────────────────────────────────────────
  group('auth', () => {
    // Unauthenticated check runs BEFORE login so no cookie is in the jar yet
    const unauthRes = http.get(`${BASE_URL}/auth/me`);
    check(unauthRes, { 'me without auth: 401': (r) => r.status === 401 });

    const loginRes = login(TEST_EMAIL, TEST_PASSWORD);
    check(loginRes, {
      'login: 200': (r) => r.status === 200,
      'login: returns user id': (r) => !!r.json('data.id'),
    });

    const meRes = http.get(`${BASE_URL}/auth/me`);
    check(meRes, {
      'me: 200': (r) => r.status === 200,
      'me: email present': (r) => !!r.json('data.email'),
    });
  });

  sleep(0.5);

  // ── Template Service ──────────────────────────────────────────────────
  group('template-service', () => {
    const endpoints = [
      [`${BASE_URL}/templates/filters?page=1&perPage=5`, 'templates'],
      [`${BASE_URL}/contexts/filters?page=1&perPage=5`, 'contexts'],
      [`${BASE_URL}/tags/filters?page=1&perPage=5`, 'tags'],
      [`${BASE_URL}/sections/filters?page=1&perPage=5`, 'sections'],
    ];
    for (const [url, name] of endpoints) {
      const res = http.get(url);
      check(res, {
        [`${name}: 200`]: (r) => r.status === 200,
        [`${name}: has data array`]: (r) => Array.isArray(r.json('data')),
      });
      sleep(0.2);
    }
  });

  sleep(0.5);

  // ── File Service ──────────────────────────────────────────────────────
  group('file-service', () => {
    const res = http.get(`${BASE_URL}/files/filters?page=1&perPage=5`);
    check(res, {
      'files: 200': (r) => r.status === 200,
      'files: has data array': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(0.5);

  // ── User Service ──────────────────────────────────────────────────────
  group('user-service', () => {
    const orgRes = http.get(`${BASE_URL}/organizations/current`);
    check(orgRes, {
      'org: 200': (r) => r.status === 200,
      'org: has id': (r) => !!r.json('data.id'),
    });

    const membersRes = http.get(`${BASE_URL}/organizations/current/members`);
    check(membersRes, { 'org members: 200': (r) => r.status === 200 });

    const countRes = http.get(`${BASE_URL}/notifications/unread-count`);
    check(countRes, { 'notifications unread-count: 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  // ── Audit Service ─────────────────────────────────────────────────────
  group('audit-service', () => {
    const res = http.get(`${BASE_URL}/audit-logs?page=1&perPage=5`);
    check(res, { 'audit-logs: 200': (r) => r.status === 200 });
  });

  logout();
}
