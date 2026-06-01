import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { asValue } from 'awilix';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildMultipartFiles } from '@/tests/helpers/multipart';
import { container } from '@/infra/container';
import type { DicomService, StorageService } from '@/shared/services';
import { buildApp } from '@/api/index';

describe('POST /api/exams/images (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();
  const uploadPrivateMock = vi.fn();
  const getPresignedUrlMock = vi.fn();
  const extractMock = vi.fn();
  const stubStorage: StorageService = {
    upload: vi.fn(),
    uploadPrivate: uploadPrivateMock,
    deleteByUrl: vi.fn(),
    deleteByKey: vi.fn(),
    getPresignedUrl: getPresignedUrlMock,
    objectExists: vi.fn(),
    copy: vi.fn(),
  };
  const stubDicom: DicomService = { extract: extractMock };

  beforeAll(async () => {
    await connectDatabase();
    container.register({ storageService: asValue(stubStorage), dicomService: asValue(stubDicom) });
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
    getPresignedUrlMock.mockReset().mockResolvedValue('https://preview');
    extractMock.mockReset();
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  const png = (field: 'olhoDireito' | 'olhoEsquerdo') => ({
    fieldName: field,
    filename: `${field}.png`,
    contentType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]),
  });

  it('401 quando não autenticado', async () => {
    authSpies.unauthenticate();
    const { body, headers } = buildMultipartFiles([png('olhoDireito')]);
    const res = await app.inject({ method: 'POST', url: '/api/exams/images', payload: body, headers });
    expect(res.statusCode).toBe(401);
  });

  it('png: 201 sem metadados, grava em pending/', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const { body, headers } = buildMultipartFiles([png('olhoDireito')]);
    const res = await app.inject({ method: 'POST', url: '/api/exams/images', payload: body, headers });

    expect(res.statusCode).toBe(201);
    const payload = res.json() as {
      metadados?: unknown;
      imagens: Array<{ uploadId: string; urlPreview: string; lateralidade?: string }>;
    };
    expect(payload.metadados).toBeUndefined();
    expect(payload.imagens).toHaveLength(1);
    expect(payload.imagens[0].lateralidade).toBe('OD');
    expect(payload.imagens[0].urlPreview).toBe('https://preview');
    expect(uploadPrivateMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringMatching(new RegExp(`^pending/${user.id}/.+\\.jpg$`)) }),
      'exam-images',
    );
    expect(extractMock).not.toHaveBeenCalled();
  });

  it('400 quando fieldname é inválido, sem chamar uploadPrivate', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    const { body, headers } = buildMultipartFiles([
      { fieldName: 'olhoCentral', filename: 'x.png', contentType: 'image/png', buffer: Buffer.from([1, 2, 3]) },
    ]);
    const res = await app.inject({ method: 'POST', url: '/api/exams/images', payload: body, headers });

    expect(res.statusCode).toBe(400);
    expect(uploadPrivateMock).not.toHaveBeenCalled();
  });

  it('dicom: 201 com metadados consolidados', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    extractMock.mockResolvedValue({
      metadata: { nomeCompleto: 'João Silva', sexo: 'MASCULINO' },
      lateralidade: 'OD',
      jpeg: Buffer.from('jpeg'),
    });
    const dicomBuf = Buffer.concat([Buffer.alloc(128, 0), Buffer.from('DICM'), Buffer.alloc(8, 0)]);
    const { body, headers } = buildMultipartFiles([
      { fieldName: 'olhoDireito', filename: 'od.dcm', contentType: 'application/dicom', buffer: dicomBuf },
    ]);
    const res = await app.inject({ method: 'POST', url: '/api/exams/images', payload: body, headers });

    expect(res.statusCode).toBe(201);
    const payload = res.json() as { metadados?: { nomeCompleto?: string } };
    expect(payload.metadados?.nomeCompleto).toBe('João Silva');
    expect(extractMock).toHaveBeenCalledTimes(1);
  });
});
