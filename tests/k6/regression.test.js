/**
 * Regression Test — 1 VU, 1 iteration, ~3 minutes
 *
 * Covers the full API surface: CRUD for all entities, error cases,
 * and auth flows. Created test data is always cleaned up at the end.
 *
 *   TEST_EMAIL=admin@example.com TEST_PASSWORD=secret k6 run tests/k6/regression.test.js
 *
 * Requirements: TEST_EMAIL account must have admin role (to delete templates/contexts/sections/tags).
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, JSON_HEADERS, THRESHOLDS_REGRESSION } from './config.js';
import { login, logout } from './lib/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: THRESHOLDS_REGRESSION,
};

export default function () {
  const state = {
    contextId: null,
    tagId: null,
    templateId: null,
    sectionId: null,
    fileId: null,
    apiKeyId: null,
    webhookId: null,
  };

  // ── Authentication ────────────────────────────────────────────────────
  group('auth', () => {
    const loginRes = login(TEST_EMAIL, TEST_PASSWORD);
    check(loginRes, {
      'login: 200': (r) => r.status === 200,
      'login: user id present': (r) => !!r.json('data.id'),
      'login: email present': (r) => !!r.json('data.email'),
    });

    const meRes = http.get(`${BASE_URL}/auth/me`);
    check(meRes, {
      'me: 200': (r) => r.status === 200,
      'me: email matches': (r) => r.json('data.email') === TEST_EMAIL,
    });

    const badLoginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'nobody@k6test.invalid', password: 'wrongpassword' }),
      { headers: JSON_HEADERS }
    );
    check(badLoginRes, {
      'bad credentials: 401 or 422': (r) => r.status === 401 || r.status === 422,
    });
  });

  sleep(0.5);

  // ── Organizations ─────────────────────────────────────────────────────
  group('organizations', () => {
    const orgRes = http.get(`${BASE_URL}/organizations/current`);
    check(orgRes, {
      'org: 200': (r) => r.status === 200,
      'org: has id': (r) => !!r.json('data.id'),
      'org: has name': (r) => !!r.json('data.name'),
    });

    const membersRes = http.get(`${BASE_URL}/organizations/current/members`);
    check(membersRes, {
      'org members: 200': (r) => r.status === 200,
      'org members: array': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(0.5);

  // ── Notifications ─────────────────────────────────────────────────────
  group('notifications', () => {
    const listRes = http.get(`${BASE_URL}/notifications?limit=10&offset=0`);
    check(listRes, {
      'notifications: 200': (r) => r.status === 200,
      'notifications: array': (r) => Array.isArray(r.json('data')),
    });

    const countRes = http.get(`${BASE_URL}/notifications/unread-count`);
    check(countRes, {
      'unread-count: 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ── Context CRUD ──────────────────────────────────────────────────────
  group('contexts', () => {
    const listRes = http.get(`${BASE_URL}/contexts/filters?page=1&perPage=10`);
    check(listRes, {
      'contexts list: 200': (r) => r.status === 200,
      'contexts list: array': (r) => Array.isArray(r.json('data')),
    });

    const createRes = http.post(
      `${BASE_URL}/contexts`,
      JSON.stringify({ name: '[TEST] k6 context', description: 'created by k6 regression test — safe to delete' }),
      { headers: JSON_HEADERS }
    );
    check(createRes, {
      'context create: 201': (r) => r.status === 201,
      'context create: returns id': (r) => !!r.json('data'),
    });
    if (createRes.status === 201) {
      state.contextId = createRes.json('data');
    }

    if (state.contextId) {
      const updateRes = http.patch(
        `${BASE_URL}/contexts/${state.contextId}`,
        JSON.stringify({ name: '[TEST] k6 context (updated)', description: 'updated by k6' }),
        { headers: JSON_HEADERS }
      );
      check(updateRes, { 'context update: 200': (r) => r.status === 200 });
    }
  });

  sleep(0.5);

  // ── Tag CRUD ──────────────────────────────────────────────────────────
  group('tags', () => {
    const listRes = http.get(`${BASE_URL}/tags/filters?page=1&perPage=10`);
    check(listRes, {
      'tags list: 200': (r) => r.status === 200,
      'tags list: array': (r) => Array.isArray(r.json('data')),
    });

    if (state.contextId) {
      const createRes = http.post(
        `${BASE_URL}/tags`,
        JSON.stringify({
          name: 'k6_test_variable',
          description: 'k6 regression test tag — safe to delete',
          type: 1,
          contextId: state.contextId,
          options: [],
        }),
        { headers: JSON_HEADERS }
      );
      check(createRes, {
        'tag create: 201': (r) => r.status === 201,
        'tag create: returns id': (r) => !!r.json('data'),
      });
      if (createRes.status === 201) {
        state.tagId = createRes.json('data');
      }

      if (state.tagId) {
        const updateRes = http.patch(
          `${BASE_URL}/tags/${state.tagId}`,
          JSON.stringify({ name: 'k6_test_variable_updated' }),
          { headers: JSON_HEADERS }
        );
        check(updateRes, { 'tag update: 200': (r) => r.status === 200 });
      }
    }
  });

  sleep(0.5);

  // ── Template CRUD ─────────────────────────────────────────────────────
  group('templates', () => {
    const listRes = http.get(`${BASE_URL}/templates/filters?page=1&perPage=10`);
    check(listRes, {
      'templates list: 200': (r) => r.status === 200,
      'templates list: array': (r) => Array.isArray(r.json('data')),
    });

    const createRes = http.post(
      `${BASE_URL}/templates`,
      JSON.stringify({ name: '[TEST] k6 template', description: 'created by k6 regression test — safe to delete' }),
      { headers: JSON_HEADERS }
    );
    check(createRes, {
      'template create: 201': (r) => r.status === 201,
      'template create: returns id': (r) => !!r.json('data'),
    });
    if (createRes.status === 201) {
      state.templateId = createRes.json('data');
    }

    if (state.templateId) {
      const updateRes = http.patch(
        `${BASE_URL}/templates/${state.templateId}`,
        JSON.stringify({ name: '[TEST] k6 template (updated)' }),
        { headers: JSON_HEADERS }
      );
      check(updateRes, { 'template update: 200': (r) => r.status === 200 });
    }
  });

  sleep(0.5);

  // ── Section CRUD ──────────────────────────────────────────────────────
  group('sections', () => {
    const listRes = http.get(`${BASE_URL}/sections/filters?page=1&perPage=10`);
    check(listRes, {
      'sections list: 200': (r) => r.status === 200,
      'sections list: array': (r) => Array.isArray(r.json('data')),
    });

    if (state.templateId) {
      const createRes = http.post(
        `${BASE_URL}/sections`,
        JSON.stringify({
          name: '[TEST] k6 section',
          description: 'created by k6 regression test — safe to delete',
          templateId: state.templateId,
          htmlContent: '<p>Hello {{k6_test_variable}}</p>',
        }),
        { headers: JSON_HEADERS }
      );
      check(createRes, {
        'section create: 201': (r) => r.status === 201,
        'section create: returns id': (r) => !!r.json('data'),
      });
      if (createRes.status === 201) {
        state.sectionId = createRes.json('data');
      }

      if (state.sectionId) {
        const updateRes = http.patch(
          `${BASE_URL}/sections/${state.sectionId}`,
          JSON.stringify({ name: '[TEST] k6 section (updated)' }),
          { headers: JSON_HEADERS }
        );
        check(updateRes, { 'section update: 200': (r) => r.status === 200 });
      }
    }
  });

  sleep(0.5);

  // ── File Generation ───────────────────────────────────────────────────
  group('files', () => {
    const listRes = http.get(`${BASE_URL}/files/filters?page=1&perPage=10`);
    check(listRes, {
      'files list: 200': (r) => r.status === 200,
      'files list: array': (r) => Array.isArray(r.json('data')),
    });

    if (state.templateId) {
      const genRes = http.post(
        `${BASE_URL}/files/async-generate`,
        JSON.stringify({
          templateId: state.templateId,
          name: '[TEST] k6-generated-file',
          payload: { k6_test_variable: 'k6 test value' },
        }),
        { headers: JSON_HEADERS }
      );
      check(genRes, {
        'file async-generate: 200 or 202': (r) => r.status === 200 || r.status === 202,
      });
      if (genRes.status === 200 || genRes.status === 202) {
        const data = genRes.json('data');
        state.fileId = (data && typeof data === 'object') ? data.id : data;
      }
    }
  });

  sleep(0.5);

  // ── API Keys ──────────────────────────────────────────────────────────
  group('api-keys', () => {
    const listRes = http.get(`${BASE_URL}/api-keys`);
    check(listRes, {
      'api-keys list: 200': (r) => r.status === 200,
      'api-keys list: array': (r) => Array.isArray(r.json('data')),
    });

    const createRes = http.post(
      `${BASE_URL}/api-keys`,
      JSON.stringify({ name: '[TEST] k6 api key' }),
      { headers: JSON_HEADERS }
    );
    check(createRes, {
      'api-key create: 200 or 201': (r) => r.status === 200 || r.status === 201,
      'api-key create: returns id': (r) => !!r.json('data.id'),
    });
    if (createRes.status === 200 || createRes.status === 201) {
      state.apiKeyId = createRes.json('data.id');
    }
  });

  sleep(0.5);

  // ── Webhooks ──────────────────────────────────────────────────────────
  group('webhooks', () => {
    const listRes = http.get(`${BASE_URL}/webhooks`);
    check(listRes, {
      'webhooks list: 200': (r) => r.status === 200,
      'webhooks list: array': (r) => Array.isArray(r.json('data')),
    });

    const createRes = http.post(
      `${BASE_URL}/webhooks`,
      JSON.stringify({
        url: 'https://webhook.site/k6-regression-test',
        events: ['template.created', 'file.generated'],
      }),
      { headers: JSON_HEADERS }
    );
    check(createRes, {
      'webhook create: 200 or 201': (r) => r.status === 200 || r.status === 201,
      'webhook create: returns id': (r) => !!r.json('data.id'),
    });
    if (createRes.status === 200 || createRes.status === 201) {
      state.webhookId = createRes.json('data.id');

      const deliveriesRes = http.get(`${BASE_URL}/webhooks/${state.webhookId}/deliveries`);
      check(deliveriesRes, { 'webhook deliveries: 200': (r) => r.status === 200 });
    }
  });

  sleep(0.5);

  // ── Audit Logs ────────────────────────────────────────────────────────
  group('audit-logs', () => {
    const res = http.get(`${BASE_URL}/audit-logs?page=1&perPage=10`);
    check(res, {
      'audit-logs: 200': (r) => r.status === 200,
      'audit-logs: array': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(0.5);

  // ── Cleanup — always runs to avoid leaving test data ──────────────────
  group('cleanup', () => {
    if (state.apiKeyId) {
      const r = http.del(`${BASE_URL}/api-keys/${state.apiKeyId}`);
      check(r, { 'api-key delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.webhookId) {
      const r = http.del(`${BASE_URL}/webhooks/${state.webhookId}`);
      check(r, { 'webhook delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.fileId) {
      sleep(2);
      const r = http.del(`${BASE_URL}/files/${state.fileId}`);
      check(r, { 'file delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.sectionId) {
      const r = http.del(`${BASE_URL}/sections/${state.sectionId}`);
      check(r, { 'section delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.templateId) {
      const r = http.del(`${BASE_URL}/templates/${state.templateId}`);
      check(r, { 'template delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.tagId) {
      const r = http.del(`${BASE_URL}/tags/${state.tagId}`);
      check(r, { 'tag delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    if (state.contextId) {
      const r = http.del(`${BASE_URL}/contexts/${state.contextId}`);
      check(r, { 'context delete: 200 or 204': (r) => r.status === 200 || r.status === 204 });
    }

    logout();
  });
}
