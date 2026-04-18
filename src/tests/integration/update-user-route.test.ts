import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';

describe('PUT /api/usuarios (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when user is not authenticated', async () => {
    authSpies.unauthenticate();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: { nomeCompleto: 'Novo Nome' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 403 when user is not authorized', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: { nomeCompleto: 'Novo Nome' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should update nomeCompleto and dtNascimento in the database', async () => {
    const user = await UsuarioBuilder.anUser()
      .withTipoPerfil('MEDICO')
      .withNomeCompleto('Nome Antigo')
      .build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: {
        nomeCompleto: 'Nome Novo',
        dtNascimento: '1990-05-10',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().usuario.nomeCompleto).toBe('Nome Novo');

    const rows = await db.select().from(usuario);
    expect(rows[0].nomeCompleto).toBe('Nome Novo');
    expect(authSpies.changeEmailSpy).not.toHaveBeenCalled();
    expect(authSpies.changePasswordSpy).not.toHaveBeenCalled();
  });

  it('should call changeEmail when email is changed', async () => {
    const user = await UsuarioBuilder.anUser()
      .withTipoPerfil('MEDICO')
      .withEmail('antigo@test.com')
      .build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: { nomeCompleto: 'Novo Nome', email: 'novo@test.com' },
    });

    expect(res.statusCode).toBe(200);
    expect(authSpies.changeEmailSpy).toHaveBeenCalledTimes(1);
    expect(authSpies.changeEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ body: { newEmail: 'novo@test.com' } }),
    );
  });

  it('should return 409 when email is already in use by another user', async () => {
    const user = await UsuarioBuilder.anUser()
      .withTipoPerfil('MEDICO')
      .withEmail('eu@test.com')
      .build();
    await UsuarioBuilder.anUser().withEmail('ocupado@test.com').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: { email: 'ocupado@test.com' },
    });

    expect(res.statusCode).toBe(409);
    expect(authSpies.changeEmailSpy).not.toHaveBeenCalled();
  });

  it('should call changePassword when senhaAtual and novaSenha are provided', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: {
        nomeCompleto: 'Mantido',
        senhaAtual: 'senhaAtual123',
        novaSenha: 'novaSenha123',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(authSpies.changePasswordSpy).toHaveBeenCalledTimes(1);
    expect(authSpies.changePasswordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          currentPassword: 'senhaAtual123',
          newPassword: 'novaSenha123',
        }),
      }),
    );
  });

  it('should return 400 when body is invalid', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: { senhaAtual: 'somente-atual' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when body has unknown fields', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios',
      payload: {
        nomeCompleto: 'Nome Novo',
        campoInvalido: 'qualquer coisa',
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
