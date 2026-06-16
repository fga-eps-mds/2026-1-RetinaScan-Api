import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { asValue } from 'awilix';
import { db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';
import { container } from '@/infra/container';

describe('GET /api/report/:examId/pdf (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();

  beforeAll(async () => {
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

  it('deve retornar 401 se o usuário não estiver autenticado', async () => {
    authSpies.unauthenticate();
    const res = await app.inject({ 
      method: 'GET', 
      url: '/api/report/c54a1d75-f346-4627-860f-13d492511058/pdf' 
    });
    expect(res.statusCode).toBe(401);
  });

  it('deve gerar PDF com sucesso quando usuário é ESPECIALISTA', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').build();
    authSpies.authenticateAs(medico);
    const exame = await ExameBuilder.anExame().withIdUsuario(medico.id).build();

    container.register({
      pdfService: asValue({
        generateFromHtml: vi.fn().mockResolvedValue(Buffer.from('fake-pdf-content'))
      })
    });

    const res = await app.inject({ 
      method: 'GET', 
      url: `/api/report/${exame.id}/pdf` 
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBe('fake-pdf-content');
  });

  it('deve retornar 500 se o exame não existir', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ 
      method: 'GET', 
      url: '/api/report/00000000-0000-0000-0000-000000000000/pdf' 
    });

    expect(res.statusCode).toBe(500);
  });
});