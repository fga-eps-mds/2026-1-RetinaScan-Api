import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'https://homologapi.retinascan.site/api';
const ORIGIN = 'https://homolog.retinascan.site';

export function login(email, password) {
  const response = http.post(
    `${BASE_URL}/auth/sign-in/email`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      tags: { name: 'login' },
    },
  );

  check(response, {
    'login status 200': (r) => r.status === 200,
  });

  return response;
}

export { BASE_URL, ORIGIN };
