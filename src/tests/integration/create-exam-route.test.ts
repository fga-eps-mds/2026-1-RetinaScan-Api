import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';

const validPatientPayload = () => ({
  nomeCompleto: 'Fulano de Tal',
  cpf: cpfUtil.generate(),
  sexo: 'MASCULINO' as const,
  dtNascimento: '1990-01-01',
});

describe('POST /api/exams (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    authSpies.restoreAll();
  });

  beforeEach(async () => {
    authSpies.resetAll();
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when user is not authenticated', async () => {
    authSpies.unauthenticate();

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 403 when user is not MEDICO', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should create an exam and persist it in the database', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const dtHora = new Date('2026-04-24T10:00:00.000Z').toISOString();
    const patient = validPatientPayload();

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...patient,
        dtHora,
        comorbidades: 'Diabetes',
        descricao: 'Exame de rotina',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.idUsuario).toBe(user.id);
    expect(body.status).toBe('CRIADO');
    expect(body.nomeCompleto).not.toBe(patient.nomeCompleto);
    expect(body.cpf).not.toBe(patient.cpf);
    expect(body.cpf).toMatch(/^\d{2}\*\.\*{3}\.\*{3}-\d{2}$/);

    const rows = await db.select().from(exam);
    expect(rows).toHaveLength(1);
    expect(rows[0].idUsuario).toBe(user.id);
    expect(rows[0].nomeCompleto).not.toBe(patient.nomeCompleto);
    expect(rows[0].dtNascimento).not.toBe(patient.dtNascimento);
    expect(rows[0].comorbidades).not.toBe('Diabetes');
    expect(rows[0].descricao).not.toBe('Exame de rotina');
  });

  it('should create an exam without optional fields', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(201);
    const rows = await db.select().from(exam);
    expect(rows[0].comorbidades).toBeNull();
    expect(rows[0].descricao).toBeNull();
  });

  it('should return 400 when cpf has invalid check digits', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        cpf: '12345678900',
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when cpf has all repeated digits', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        cpf: '11111111111',
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when sexo is invalid', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        sexo: 'INVALIDO',
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when dtHora is not a valid datetime', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: 'not-a-date',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when nomeCompleto is an empty string', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        nomeCompleto: '',
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when nomeCompleto contains only whitespace', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        nomeCompleto: '   ',
        dtHora: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when comorbidades is an empty string', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
        comorbidades: '',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when comorbidades contains only whitespace', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
        comorbidades: '   ',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when descricao is an empty string', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
        descricao: '',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when descricao contains only whitespace', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
        descricao: '\t\n ',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when body has unknown fields', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        ...validPatientPayload(),
        dtHora: new Date().toISOString(),
        campoInvalido: 'xxx',
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
