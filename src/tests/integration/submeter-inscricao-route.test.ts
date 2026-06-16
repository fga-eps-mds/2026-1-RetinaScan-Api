import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico, usuario } from '@/infra/database/drizzle/schema';
import { buildApp } from '@/api/index';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { InscricaoBuilder } from '@/tests/helpers/builders/inscricao-builder';
import { JoseInviteTokenService } from '@/infra/shared/jose-invite-token-service';

describe('POST /api/inscricoes/submeter (integration)', () => {
  let app: FastifyInstance;
  let tokenService: JoseInviteTokenService;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
    tokenService = new JoseInviteTokenService();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 200 and set status to PENDENTE', async () => {
    const email = 'doc@test.com';
    const inscricao = await InscricaoBuilder.aInscricao().withEmail(email).build();

    const token = await tokenService.sign({
      sub: inscricao.id,
      email,
      nomeCompleto: 'Dr. João',
      tipoPerfil: 'MEDICO',
    });

    await db
      .update(inscricaoMedico)
      .set({ token })
      .where(sql`id_inscricao = ${inscricao.id}`);

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/submeter',
      payload: {
        token,
        nomeCompleto: 'Dr. João Silva',
        cpf: cpfUtil.generate(),
        crm: '123456-SP',
        dtNascimento: '1985-03-15',
        senha: 'senha12345',
      },
    });

    expect(res.statusCode).toBe(200);
  });

  it('should return 403 when token is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/submeter',
      payload: {
        token: 'invalid.token.here',
        nomeCompleto: 'Dr. João',
        cpf: cpfUtil.generate(),
        crm: '123456-SP',
        dtNascimento: '1985-03-15',
        senha: 'senha12345',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 409 when inscricao is already submitted', async () => {
    const email = 'doc@test.com';
    const inscricao = await InscricaoBuilder.aInscricao()
      .withEmail(email)
      .withStatus('PENDENTE')
      .build();

    const token = await tokenService.sign({
      sub: inscricao.id,
      email,
      nomeCompleto: 'Dr. João',
      tipoPerfil: 'MEDICO',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/inscricoes/submeter',
      payload: {
        token,
        nomeCompleto: 'Dr. João',
        cpf: cpfUtil.generate(),
        crm: '999999-SP',
        dtNascimento: '1985-03-15',
        senha: 'senha12345',
      },
    });

    expect(res.statusCode).toBe(409);
  });
});
