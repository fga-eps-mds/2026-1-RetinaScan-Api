import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { container, registerAppOnContainer } from '@/infra/container';
import { buildApp } from '@/api/index.js';
import { eq } from 'drizzle-orm';
import { db, connectDatabase } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema/user';
import { env } from '@/env';
import { auth } from '@/lib/auth';

describe('POST /auth/recover-by-crm', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
    registerAppOnContainer(app);

    // Create a test user in the DB
    await db.delete(usuario).where(eq(usuario.email, 'test.recover.crm@example.com'));
    await db.insert(usuario).values({
      id: 'recover-user-123',
      email: 'test.recover.crm@example.com',
      crm: 'CRM-RECOVER-999',
      nomeCompleto: 'Test Recover CRM',
      cpf: '00011122233',
      tipoPerfil: 'MEDICO',
      status: 'ATIVO',
    });
  });

  afterAll(async () => {
    await db.delete(usuario).where(eq(usuario.email, 'test.recover.crm@example.com'));
    await app.close();
  });

  it('should return masked email when providing a valid CRM', async () => {
    // We spy on auth.api.requestPasswordReset to prevent actually sending real emails during integration tests
    const requestPasswordResetSpy = vi.spyOn(auth.api, 'requestPasswordReset').mockResolvedValue(undefined as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/recover-by-crm',
      payload: {
        crm: 'CRM-RECOVER-999',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.maskedEmail).toBe('t***************@example.com');
    expect(body.message).toContain('Se houver uma conta com este CRM');

    expect(requestPasswordResetSpy).toHaveBeenCalled();
    const callArgs = requestPasswordResetSpy.mock.calls[0][0];
    expect(callArgs?.body?.email).toBe('test.recover.crm@example.com');
    expect(callArgs?.body?.redirectTo).toBe(`${env.BETTER_AUTH_URL || `http://localhost:${env.PORT}`}/reset-password`);

    requestPasswordResetSpy.mockRestore();
  });

  it('should return 400 when CRM is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/recover-by-crm',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 when CRM does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/recover-by-crm',
      payload: {
        crm: 'NON-EXISTENT-CRM',
      },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.message).toBe('Nenhum usuário encontrado com o CRM informado');
  });
});
