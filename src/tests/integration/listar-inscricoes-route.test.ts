import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico, usuario } from '@/infra/database/drizzle/schema';
import { buildApp } from '@/api/index';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { InscricaoBuilder } from '@/tests/helpers/builders/inscricao-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';

describe('GET /api/inscricoes (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when not authenticated', async () => {
    authSpies.unauthenticate();
    const res = await app.inject({ method: 'GET', url: '/api/inscricoes' });
    expect(res.statusCode).toBe(401);
  });

  it('should return all inscricoes without encryptedPassword', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();
    await InscricaoBuilder.aInscricao().withStatus('CONVITE_ENVIADO').build();

    const res = await app.inject({ method: 'GET', url: '/api/inscricoes' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).not.toHaveProperty('encryptedPassword');
  });

  it('should filter by status', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();
    await InscricaoBuilder.aInscricao().withStatus('CONVITE_ENVIADO').build();

    const res = await app.inject({ method: 'GET', url: '/api/inscricoes?status=PENDENTE' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });
});
