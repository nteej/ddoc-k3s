import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, JSON_HEADERS } from '../config.js';

export function login(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS }
  );
  check(res, { 'login: 200': (r) => r.status === 200 });
  return res;
}

export function logout() {
  return http.post(`${BASE_URL}/auth/logout`, null, { headers: JSON_HEADERS });
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
