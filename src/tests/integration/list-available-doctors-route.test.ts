import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, examShare, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';
import { faker } from '@faker-js/faker';

describe('GET /api/medicos/disponiveis (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${examShare} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('deve retornar 401 se não estiver autenticado', async () => {
    authSpies.unauthenticate();
    const res = await app.inject({ method: 'GET', url: '/api/medicos/disponiveis' });
    expect(res.statusCode).toBe(401);
  });

  it('deve retornar apenas MEDICO e ESPECIALISTA', async () => {
    const medico1 = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const especialista1 = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').build();
    await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();

    authSpies.authenticateAs(medico1);

    const res = await app.inject({ method: 'GET', url: '/api/medicos/disponiveis' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveLength(2);
    
    const ids = body.map((m: any) => m.id);
    expect(ids).toContain(medico1.id);
    expect(ids).toContain(especialista1.id);
    
    expect(body[0].cpf).toBeUndefined();
    expect(body[0].password).toBeUndefined();
  });

  it('deve filtrar por nome (busca)', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').withNomeCompleto('Dra. Ana Silva').build();
    const alvo = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').withNomeCompleto('Dr. Marcos Paulo').build();

    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: '/api/medicos/disponiveis?busca=Marcos' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(alvo.id);
  });
});
