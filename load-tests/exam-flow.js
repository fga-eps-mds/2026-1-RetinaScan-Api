import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';
import { login, BASE_URL, ORIGIN } from './lib/auth.js';

const examsCreated = new Counter('exams_created');
const imagesUploaded = new Counter('images_uploaded');
const fullFlowSuccess = new Rate('full_flow_success');
const fullFlowDuration = new Trend('full_flow_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:create-exam}': ['p(95)<800'],
    'http_req_duration{name:upload-images}': ['p(95)<3000'],
    full_flow_success: ['rate>0.99'],
    full_flow_duration: ['p(95)<4000'],
  },
};

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));
const patients = new SharedArray('patients', () => JSON.parse(open('./patients.json')));
const eyeImage = open('./fixtures/eye.jpg', 'b');

export function setup() {
  const user = users[0];
  const response = login(user.email, user.password);

  const setCookie = response.headers['Set-Cookie'] || response.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  const match = cookieHeader && /better-auth\.session_token=[^;]+/.exec(cookieHeader);

  if (!match) throw new Error(`setup: login falhou status=${response.status} body=${response.body}`);

  return { cookie: match[0] };
}

function pickPatient() {
  return patients[Math.floor(Math.random() * patients.length)];
}

function createExam(cookie) {
  const patient = pickPatient();
  const body = {
    nomeCompleto: patient.nomeCompleto,
    cpf: patient.cpf,
    sexo: patient.sexo,
    dtNascimento: patient.dtNascimento,
    dtHora: new Date().toISOString(),
  };

  return http.post(`${BASE_URL}/exams`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: ORIGIN },
    tags: { name: 'create-exam' },
  });
}

function uploadImages(cookie, examId) {
  const data = {
    olhoDireito: http.file(eyeImage, 'olho-direito.jpg', 'image/jpeg'),
    olhoEsquerdo: http.file(eyeImage, 'olho-esquerdo.jpg', 'image/jpeg'),
  };

  return http.post(`${BASE_URL}/exams/${examId}/images`, data, {
    headers: { Cookie: cookie, Origin: ORIGIN },
    tags: { name: 'upload-images' },
  });
}

export default function (data) {
  const cookie = data.cookie;
  const flowStart = Date.now();

  const createRes = createExam(cookie);

  const created = check(createRes, {
    'create-exam status 201': (r) => r.status === 201,
  });
  examsCreated.add(created ? 1 : 0);

  if (!created) {
    fullFlowSuccess.add(false);
    sleep(1);
    return;
  }

  const examId = createRes.json('id');

  if (!examId) {
    console.error(`create-exam without id: ${createRes.body}`);
    fullFlowSuccess.add(false);
    sleep(1);
    return;
  }

  const uploadRes = uploadImages(cookie, examId);

  const uploaded = check(uploadRes, {
    'upload-images status 201': (r) => r.status === 201,
  });

  const success = created && uploaded;
  fullFlowSuccess.add(success);
  imagesUploaded.add(success ? 2 : 0);
  fullFlowDuration.add(Date.now() - flowStart);

  sleep(1);
}
