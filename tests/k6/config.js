export const BASE_URL = (__ENV.BASE_URL || 'https://ddoc.fi/api').replace(/\/$/, '');
export const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@example.com';
export const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password';

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const THRESHOLDS_SMOKE = {
  http_req_duration: ['p(95)<3000'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate==1.0'],
};

export const THRESHOLDS_REGRESSION = {
  http_req_duration: ['p(95)<5000'],
  http_req_failed: ['rate<0.05'],
  checks: ['rate>0.90'],
};

export const THRESHOLDS_LOAD = {
  'http_req_duration{scenario:browse}': ['p(95)<1000'],
  'http_req_duration{scenario:write}': ['p(95)<2000'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.98'],
};
