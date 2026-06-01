import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { login } from './lib/auth.js';

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  login(user.email, user.password);
  sleep(1);
}
