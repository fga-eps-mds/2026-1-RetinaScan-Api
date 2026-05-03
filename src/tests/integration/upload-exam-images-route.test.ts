import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { asValue } from 'awilix';
import { randomUUID } from 'node:crypto';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import {
  buildEmptyMultipart,
  buildMultipartFiles,
  type MultipartFilePart,
} from '@/tests/helpers/multipart';
import { container } from '@/infra/container';
import type { StorageService } from '@/shared/services';
import { buildApp } from '@/api/index';

describe('POST /api/exams/:id/images (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();
  const uploadPrivateMock = vi.fn();
  const deleteByKeyMock = vi.fn();
  const stubStorage: StorageService = {
    upload: vi.fn(),
    uploadPrivate: uploadPrivateMock,
    deleteByUrl: vi.fn(),
    deleteByKey: deleteByKeyMock,
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
    uploadPrivateMock.mockReset().mockResolvedValue(undefined);
    deleteByKeyMock.mockReset().mockResolvedValue(undefined);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  function pngFile(field: 'olhoDireito' | 'olhoEsquerdo'): MultipartFilePart {
    return {
      fieldName: field,
      filename: `${field}.png`,
      contentType: 'image/png',
      buffer: Buffer.from(`fake-${field}-bytes`),
    };
  }

  it('returns 401 when unauthenticated', async () => {
    authSpies.unauthenticate();

    const { body, headers } = buildMultipartFiles([pngFile('olhoDireito')]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${randomUUID()}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(401);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });

  it('returns 400 when no files are sent', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const exame = await ExameBuilder.anExame().withIdUsuario(user.id).build();

    const { body, headers } = buildEmptyMultipart();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(400);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });

  it('returns 400 when MIME type is invalid', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const exame = await ExameBuilder.anExame().withIdUsuario(user.id).build();

    const { body, headers } = buildMultipartFiles([
      {
        fieldName: 'olhoDireito',
        filename: 'foo.gif',
        contentType: 'image/gif',
        buffer: Buffer.from('xxx'),
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(400);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });

  it('returns 201 when uploading a single eye', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const exame = await ExameBuilder.anExame().withIdUsuario(user.id).build();

    const { body, headers } = buildMultipartFiles([pngFile('olhoDireito')]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(201);
    const payload = res.json() as { imagens: Array<Record<string, unknown>> };
    expect(payload.imagens).toHaveLength(1);
    expect(payload.imagens[0]).toMatchObject({
      idExame: exame.id,
      lateralidadeOlho: 'OD',
      qualidadeImg: 'Pendente',
    });
    expect(payload.imagens[0]).not.toHaveProperty('caminhoImg');

    expect(uploadPrivateMock).toHaveBeenCalledTimes(1);
    expect(uploadPrivateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining(`exams/${exame.id}/OD-`),
        contentType: 'image/png',
        buffer: expect.any(Buffer),
      }),
      'exam-images',
    );

    const rows = await db.select().from(imagem);
    expect(rows).toHaveLength(1);
    expect(rows[0].idExame).toBe(exame.id);
    expect(rows[0].lateralidadeOlho).toBe('OD');
    expect(rows[0].qualidadeImg).toBe('Pendente');
  });

  it('returns 201 when uploading both eyes', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const exame = await ExameBuilder.anExame().withIdUsuario(user.id).build();

    const { body, headers } = buildMultipartFiles([
      pngFile('olhoDireito'),
      pngFile('olhoEsquerdo'),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(201);
    const payload = res.json() as { imagens: Array<{ lateralidadeOlho: string }> };
    expect(payload.imagens).toHaveLength(2);
    const sides = payload.imagens.map((i) => i.lateralidadeOlho).sort();
    expect(sides).toEqual(['OD', 'OE']);
    expect(payload.imagens.every((i) => !('caminhoImg' in i))).toBe(true);

    expect(uploadPrivateMock).toHaveBeenCalledTimes(2);

    const rows = await db.select().from(imagem);
    expect(rows).toHaveLength(2);
  });

  it('returns 409 on re-upload', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const exame = await ExameBuilder.anExame().withIdUsuario(user.id).build();

    const first = buildMultipartFiles([pngFile('olhoDireito')]);
    const firstRes = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: first.body,
      headers: first.headers,
    });
    expect(firstRes.statusCode).toBe(201);

    const second = buildMultipartFiles([pngFile('olhoEsquerdo')]);
    const secondRes = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: second.body,
      headers: second.headers,
    });

    expect(secondRes.statusCode).toBe(409);
  });

  it('returns 404 when medic is not the exam owner', async () => {
    const owner = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const intruder = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(intruder);
    const exame = await ExameBuilder.anExame().withIdUsuario(owner.id).build();

    const { body, headers } = buildMultipartFiles([pngFile('olhoDireito')]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(404);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });

  it('returns 404 when exam does not exist', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const { body, headers } = buildMultipartFiles([pngFile('olhoDireito')]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${randomUUID()}/images`,
      payload: body,
      headers,
    });

    expect(res.statusCode).toBe(404);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });
});
