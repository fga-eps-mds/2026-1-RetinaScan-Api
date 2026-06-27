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

describe('DELETE /api/exams/:examId/shares/:shareId (integration)', () => {
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
    const res = await app.inject({ method: 'DELETE', url: '/api/exams/123/shares/456' });
    expect(res.statusCode).toBe(401);
  });

  it('deve revogar acesso do médico com sucesso (soft delete)', async () => {
    const dono = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const colega = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(dono.id).build();

    const [insertedShare] = await db.insert(examShare).values({
      examId: exame.id,
      medicoDestinoId: colega.id,
      compartilhadoPor: dono.id,
      ativo: true,
    }).returning();

    authSpies.authenticateAs(dono);

    const res = await app.inject({ method: 'DELETE', url: `/api/exams/${exame.id}/shares/${insertedShare.id}` });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.message).toBe('Acesso revogado com sucesso.');

    const shareDB = await db.query.examShare.findFirst({ where: (share, { eq }) => eq(share.id, insertedShare.id) });
    expect(shareDB?.ativo).toBe(false);
  });

  it('deve bloquear tentativa de revogar acesso de exame de terceiros', async () => {
    const hacker = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const vitima = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const colegaReal = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(vitima.id).build();

    const [insertedShare] = await db.insert(examShare).values({
      examId: exame.id,
      medicoDestinoId: colegaReal.id,
      compartilhadoPor: vitima.id,
      ativo: true,
    }).returning();

    authSpies.authenticateAs(hacker);

    const res = await app.inject({ method: 'DELETE', url: `/api/exams/${exame.id}/shares/${insertedShare.id}` });
    expect(res.statusCode).toBe(403);
  });
});
