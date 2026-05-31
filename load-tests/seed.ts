import { faker } from '@faker-js/faker';
import { cpf as cpfLib } from 'cpf-cnpj-validator';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = 'https://homologapi.retinascan.site/api';
const ORIGIN = 'https://homolog.retinascan.site';
const ADMIN_EMAIL = 'admin@retinascan.local';
const ADMIN_PASSWORD = 'admin-retina';
const COUNT = Number(process.env.LOAD_TEST_USERS ?? 50);
const PASSWORD = 'LoadTest123!';

interface SeededUser {
  email: string;
  password: string;
}

interface SeededPatient {
  nomeCompleto: string;
  cpf: string;
  sexo: 'MASCULINO' | 'FEMININO';
  dtNascimento: string;
}

async function loginAsAdmin(): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login admin falhou: ${response.status} ${await response.text()}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('Sem cookie de sessão na resposta de login.');

  const match = /better-auth\.session_token=[^;]+/.exec(setCookie);
  if (!match) throw new Error('Cookie better-auth.session_token não encontrado.');

  return match[0];
}

async function createMedico(cookie: string): Promise<SeededUser> {
  const email = `loadtest+${faker.string.uuid()}@retinascan.local`;

  const body = {
    nomeCompleto: faker.person.fullName(),
    email,
    cpf: cpfLib.generate(),
    crm: faker.string.numeric(6),
    dtNascimento: '1990-01-01',
    senha: PASSWORD,
    tipoPerfil: 'MEDICO' as const,
  };

  const response = await fetch(`${BASE_URL}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: ORIGIN },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar médico ${email}: ${response.status} ${await response.text()}`);
  }

  return { email, password: PASSWORD };
}

async function main(): Promise<void> {
  console.log(`Logando como admin (${ADMIN_EMAIL})...`);
  const cookie = await loginAsAdmin();

  console.log(`Criando ${COUNT} médicos...`);
  const users: SeededUser[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    try {
      const user = await createMedico(cookie);
      users.push(user);
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${COUNT}`);
    } catch (error) {
      console.error(`  erro no índice ${i}:`, (error as Error).message);
    }
  }

  const usersPath = resolve(__dirname, 'users.json');
  writeFileSync(usersPath, JSON.stringify(users, null, 2));
  console.log(`Escrito ${users.length} usuários em ${usersPath}`);

  console.log(`Gerando ${COUNT} pacientes (CPFs válidos)...`);
  const patients: SeededPatient[] = Array.from({ length: COUNT }, () => ({
    nomeCompleto: faker.person.fullName(),
    cpf: cpfLib.generate(),
    sexo: faker.helpers.arrayElement(['MASCULINO', 'FEMININO'] as const),
    dtNascimento: faker.date.birthdate({ min: 20, max: 80, mode: 'age' }).toISOString().slice(0, 10),
  }));

  const patientsPath = resolve(__dirname, 'patients.json');
  writeFileSync(patientsPath, JSON.stringify(patients, null, 2));
  console.log(`Escrito ${patients.length} pacientes em ${patientsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
