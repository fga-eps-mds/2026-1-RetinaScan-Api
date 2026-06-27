import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, examShare, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';

describe('GET /api/exams/shares/my-shares (integration)', () => {
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
    const res = await app.inject({ method: 'GET', url: '/api/exams/shares/my-shares' });
    expect(res.statusCode).toBe(401);
  });

  it('deve listar os compartilhamentos globais do médico logado', async () => {
    const dono = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const colega = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').build();
    const exame1 = await ExameBuilder.anExame().withIdUsuario(dono.id).build();
    const exame2 = await ExameBuilder.anExame().withIdUsuario(dono.id).build();

    await db.insert(examShare).values([
      {
        examId: exame1.id,
        medicoDestinoId: colega.id,
        compartilhadoPor: dono.id,
        ativo: true,
      },
      {
        examId: exame2.id,
        medicoDestinoId: colega.id,
        compartilhadoPor: dono.id,
        ativo: true,
      }
    ]);

    authSpies.authenticateAs(dono);

    const res = await app.inject({ method: 'GET', url: '/api/exams/shares/my-shares' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].medicoDestino.id).toBe(colega.id);
  });
});
