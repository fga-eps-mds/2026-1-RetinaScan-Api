import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico, usuario } from '@/infra/database/drizzle/schema';
import { buildApp } from '@/api/index';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { InscricaoBuilder } from '@/tests/helpers/builders/inscricao-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { auth } from '@/lib/auth';

describe('PATCH /api/inscricoes/:id/avaliar (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();
  let signUpEmailSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
    signUpEmailSpy = vi.spyOn(auth.api, 'signUpEmail').mockResolvedValue(undefined as any);
  });

  afterAll(async () => {
    await app.close();
    authSpies.restoreAll();
    signUpEmailSpy.mockRestore();
  });

  beforeEach(async () => {
    authSpies.resetAll();
    signUpEmailSpy.mockClear();
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when not authenticated', async () => {
    authSpies.unauthenticate();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/inscricoes/some-id/avaliar',
      payload: { decisao: 'APROVADA' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('should approve and call signUpEmail', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const inscricao = await InscricaoBuilder.aInscricao()
      .withStatus('PENDENTE')
      .withFormData()
      .build();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/inscricoes/${inscricao.id}/avaliar`,
      payload: { decisao: 'APROVADA' },
    });

    expect(res.statusCode).toBe(200);
    expect(signUpEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject with motivo without calling signUpEmail', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const inscricao = await InscricaoBuilder.aInscricao()
      .withStatus('PENDENTE')
      .withFormData()
      .build();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/inscricoes/${inscricao.id}/avaliar`,
      payload: { decisao: 'REJEITADA', motivoRejeicao: 'Documentação inválida' },
    });

    expect(res.statusCode).toBe(200);
    expect(signUpEmailSpy).not.toHaveBeenCalled();
  });

  it('should return 400 when REJEITADA without motivoRejeicao', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const inscricao = await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/inscricoes/${inscricao.id}/avaliar`,
      payload: { decisao: 'REJEITADA' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 when inscricao not found', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/inscricoes/non-existent-id/avaliar',
      payload: { decisao: 'APROVADA' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 409 when inscricao is not PENDENTE', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const inscricao = await InscricaoBuilder.aInscricao().withStatus('APROVADA').build();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/inscricoes/${inscricao.id}/avaliar`,
      payload: { decisao: 'APROVADA' },
    });

    expect(res.statusCode).toBe(409);
  });
});
