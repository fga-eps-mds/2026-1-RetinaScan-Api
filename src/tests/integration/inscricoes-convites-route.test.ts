import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico, usuario } from '@/infra/database/drizzle/schema';
import { buildApp } from '@/api/index';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { BullMQMessageBroker } from '@/infra/queue/notify-bullmq-service';

describe('POST /api/inscricoes/convites (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
    vi.spyOn(BullMQMessageBroker.prototype, 'publish').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
    authSpies.restoreAll();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    authSpies.resetAll();
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when not authenticated', async () => {
    authSpies.unauthenticate();

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: { convites: [{ email: 'doc@test.com', nome: 'Dr. João' }] },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 403 when authenticated as MEDICO', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: { convites: [{ email: 'doc@test.com', nome: 'Dr. João' }] },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 201 with summary when admin sends valid invites', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: {
        convites: [
          { email: 'doc1@test.com', nome: 'Dr. A', tipoPerfil: 'MEDICO' },
          { email: 'doc2@test.com', nome: 'Dr. B', tipoPerfil: 'ESPECIALISTA' },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.enviados).toBe(2);
    expect(body.ignorados).toBe(0);
    expect(body.detalhes).toHaveLength(2);
  });

  it('should ignore email that already has active invite', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: { convites: [{ email: 'existing@test.com', nome: 'Dr. X' }] },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: { convites: [{ email: 'existing@test.com', nome: 'Dr. X' }] },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.enviados).toBe(0);
    expect(body.ignorados).toBe(1);
    expect(body.detalhes[0].status).toBe('ignorado');
  });

  it('should return 400 on invalid body', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/convites',
      payload: { convites: [] },
    });

    expect(res.statusCode).toBe(400);
  });
});
