import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { asValue } from 'awilix';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildEmptyMultipart, buildMultipart } from '@/tests/helpers/multipart';
import { container } from '@/infra/container';
import type { StorageService } from '@/shared/services';
import { buildApp } from '@/api/index';

describe('PATCH /api/usuarios/imagem (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();
  const uploadMock = vi.fn();
  const stubStorage: StorageService = {
    upload: uploadMock,
    uploadPrivate: vi.fn(),
    deleteByUrl: vi.fn(),
    deleteByKey: vi.fn(),
  };

  beforeAll(async () => {
    await connectDatabase();
    container.register({ storageService: asValue(stubStorage) });
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    authSpies.restoreAll();
  });

  beforeEach(async () => {
    authSpies.resetAll();
    uploadMock.mockReset();
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when user is not authenticated', async () => {
    authSpies.unauthenticate();

    const { body, headers } = buildMultipart('image', 'a.png', 'image/png', Buffer.from('x'));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/usuarios/imagem',
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 403 when user is not authorized', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(user);

    const { body, headers } = buildMultipart('image', 'a.png', 'image/png', Buffer.from('x'));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/usuarios/imagem',
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 200 when image is uploaded successfully', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const uploadedUrl = 'https://minio.local/user-images/abc.png';
    uploadMock.mockResolvedValueOnce(uploadedUrl);

    const fileBuffer = Buffer.from('fake-image-bytes');
    const { body, headers } = buildMultipart('image', 'foto.png', 'image/png', fileBuffer);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/usuarios/imagem',
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ url: uploadedUrl });

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining(`${user.id}-`),
        contentType: 'image/png',
        buffer: expect.any(Buffer),
      }),
      'user-images',
    );

    const rows = await db.select().from(usuario);
    expect(rows[0].image).toBe(uploadedUrl);
  });

  it('should return 400 when the image content-type is not supported', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const { body, headers } = buildMultipart('image', 'a.gif', 'image/gif', Buffer.from('xyz'));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/usuarios/imagem',
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('should return 400 when no file is sent', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const { body, headers } = buildEmptyMultipart();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/usuarios/imagem',
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
