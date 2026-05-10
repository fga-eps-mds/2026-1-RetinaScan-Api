import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';

describe('GET /api/exams (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when user is not authenticated', async () => {
    authSpies.unauthenticate();

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.statusCode).toBe(401);
  });

  it('should return 403 when user is not MEDICO', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.statusCode).toBe(403);
  });

  it('should return only exams created by the authenticated medico', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const outroMedico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    await ExameBuilder.anExame().withIdUsuario(medico.id).build();
    await ExameBuilder.anExame().withIdUsuario(medico.id).build();
    await ExameBuilder.anExame().withIdUsuario(outroMedico.id).build();

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });

  it('should return list items with id, nomeCompleto, olho, status and dtCriacao', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const exame = await ExameBuilder.anExame()
      .withIdUsuario(medico.id)
      .withNomeCompleto('Maria Silva')
      .withOlho('AO')
      .build();

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    const [item] = body.data;
    expect(Object.keys(item).sort()).toEqual(['dtCriacao', 'id', 'nomeCompleto', 'olho', 'status']);
    expect(item.id).toBe(exame.id);
    expect(item.nomeCompleto).toBe('Maria Silva');
    expect(item.olho).toBe('AO');
    expect(item.status).toBe('CRIADO');
    expect(typeof item.dtCriacao).toBe('string');
  });

  it.each([
    { olho: 'OD' as const },
    { olho: 'OE' as const },
    { olho: 'AO' as const },
  ])('should return olho=$olho when stored on the exam', async ({ olho }) => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    await ExameBuilder.anExame().withIdUsuario(medico.id).withOlho(olho).build();

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.json().data[0].olho).toBe(olho);
  });

  it('should return olho=null when no olho is stored', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    await ExameBuilder.anExame().withIdUsuario(medico.id).build();

    const res = await app.inject({ method: 'GET', url: '/api/exams' });

    expect(res.json().data[0].olho).toBeNull();
  });

  it('should filter by cpf within the medico scope', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const targetCpf = cpfUtil.generate();
    await ExameBuilder.anExame().withIdUsuario(medico.id).withCpf(targetCpf).build();
    await ExameBuilder.anExame().withIdUsuario(medico.id).build();

    const res = await app.inject({
      method: 'GET',
      url: `/api/exams?cpf=${encodeURIComponent(targetCpf)}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('should filter by partial nomeCompleto (case-insensitive)', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    await ExameBuilder.anExame().withIdUsuario(medico.id).withNomeCompleto('Maria Silva').build();
    await ExameBuilder.anExame().withIdUsuario(medico.id).withNomeCompleto('Mariana Souza').build();
    await ExameBuilder.anExame().withIdUsuario(medico.id).withNomeCompleto('João Pedro').build();

    const res = await app.inject({ method: 'GET', url: '/api/exams?nomeCompleto=mari' });

    const body = res.json();
    expect(body.data).toHaveLength(2);
  });

  it('should respect page and pageSize', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    for (let i = 0; i < 5; i++) {
      await ExameBuilder.anExame().withIdUsuario(medico.id).build();
    }

    const res = await app.inject({ method: 'GET', url: '/api/exams?page=2&pageSize=2' });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('should return 400 when cpf has invalid check digits', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: '/api/exams?cpf=12345678900' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 on unknown query field', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: '/api/exams?foo=bar' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when page is not a positive integer', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: '/api/exams?page=0' });

    expect(res.statusCode).toBe(400);
  });
});
