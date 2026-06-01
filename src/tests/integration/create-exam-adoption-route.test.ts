import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { asValue } from 'awilix';
import { randomUUID } from 'node:crypto';
import { cpf } from 'cpf-cnpj-validator';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { container } from '@/infra/container';
import type { MessageBroker, StorageService } from '@/shared/services';
import { buildApp } from '@/api/index';

describe('POST /api/exams (create + adopt images) (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();
  const objectExistsMock = vi.fn();
  const copyMock = vi.fn();
  const deleteByKeyMock = vi.fn();
  const publishMock = vi.fn();
  const stubStorage: StorageService = {
    upload: vi.fn(),
    uploadPrivate: vi.fn(),
    deleteByUrl: vi.fn(),
    deleteByKey: deleteByKeyMock,
    getPresignedUrl: vi.fn(),
    objectExists: objectExistsMock,
    copy: copyMock,
  };
  const stubBroker: MessageBroker = { publish: publishMock };

  const baseExamPayload = () => ({
    nomeCompleto: 'João da Silva',
    cpf: cpf.generate(),
    sexo: 'MASCULINO',
    dtNascimento: '1980-05-20',
    dtHora: new Date().toISOString(),
    comorbidades: {},
  });

  beforeAll(async () => {
    await connectDatabase();
    container.register({ storageService: asValue(stubStorage), messageBroker: asValue(stubBroker) });
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    authSpies.restoreAll();
  });
  beforeEach(async () => {
    authSpies.resetAll();
    objectExistsMock.mockReset().mockResolvedValue(true);
    copyMock.mockReset().mockResolvedValue(undefined);
    deleteByKeyMock.mockReset().mockResolvedValue(undefined);
    publishMock.mockReset().mockResolvedValue(undefined);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('201: cria exame adotando upload, status EM_PROCESSAMENTO e dispara IA', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { ...baseExamPayload(), imagens: [{ uploadId: randomUUID(), lateralidade: 'OD' }] },
    });

    expect(res.statusCode).toBe(201);
    expect(objectExistsMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^pending/${user.id}/.+\\.jpg$`)),
      'exam-images',
    );
    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalled();

    const imgRows = await db.select().from(imagem);
    expect(imgRows).toHaveLength(1);
    const [examRow] = await db.select().from(exam);
    expect(examRow.status).toBe('EM_PROCESSAMENTO');
    expect(examRow.olho).toBe('OD');
  });

  it('404 quando o upload não existe', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);
    objectExistsMock.mockResolvedValue(false);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { ...baseExamPayload(), imagens: [{ uploadId: randomUUID(), lateralidade: 'OD' }] },
    });
    expect(res.statusCode).toBe(404);
  });

  it('400 quando imagens está vazio', async () => {
    const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(user);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { ...baseExamPayload(), imagens: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
