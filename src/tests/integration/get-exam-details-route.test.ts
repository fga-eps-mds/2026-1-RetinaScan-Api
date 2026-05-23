import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import {
  exam,
  examComorbidity,
  imagem,
  resultadoIa,
  usuario,
} from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ImagemBuilder } from '@/tests/helpers/builders/imagem-builder';
import { ResultadoIaBuilder } from '@/tests/helpers/builders/resultado-ia-builder';
import { ComorbidadeBuilder } from '@/tests/helpers/builders/comorbidade-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { ExameStatus } from '@/modules/exam/exam';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { container } from '@/infra/container';
import { buildApp } from '@/api/index';

describe('GET /api/exams/:examId (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${resultadoIa} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${examComorbidity} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);

    const storageService = container.resolve('storageService');
    vi.spyOn(storageService, 'getPresignedUrl').mockImplementation(
      async ({ key }) => `https://signed.local/${key}?X-Amz-Signature=fake`,
    );
  });

  it('retorna 401 quando não autenticado', async () => {
    authSpies.unauthenticate();
    const res = await app.inject({
      method: 'GET',
      url: '/api/exams/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 400 quando examId não é UUID', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: '/api/exams/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 404 quando exame não existe', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({
      method: 'GET',
      url: '/api/exams/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('retorna 403 quando MEDICO tenta ver exame de outro médico', async () => {
    const dono = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const intruso = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(dono.id).build();
    authSpies.authenticateAs(intruso);

    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });
    expect(res.statusCode).toBe(403);
  });

  it('retorna 200 com payload completo para MEDICO dono em exame CONCLUIDO', async () => {
    const medico = await UsuarioBuilder.anUser()
      .withTipoPerfil('MEDICO')
      .withNomeCompleto('Dr. Silva')
      .build();
    const exame = await ExameBuilder.anExame()
      .withIdUsuario(medico.id)
      .withStatus(ExameStatus.CONCLUIDO)
      .build();
    const imgOd = await ImagemBuilder.anImagem()
      .withIdExame(exame.id)
      .withLateralidadeOlho(LateralidadeOlho.OD)
      .build();
    const imgOe = await ImagemBuilder.anImagem()
      .withIdExame(exame.id)
      .withLateralidadeOlho(LateralidadeOlho.OE)
      .build();
    await ResultadoIaBuilder.aResultadoIa()
      .withIdImagem(imgOd.id)
      .withPredictedLabel('Normal')
      .build();
    await ResultadoIaBuilder.aResultadoIa()
      .withIdImagem(imgOe.id)
      .withPredictedLabel('Alterado')
      .build();

    authSpies.authenticateAs(medico);
    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(exame.id);
    expect(body.status).toBe('CONCLUIDO');
    expect(body.medico).toEqual({ id: medico.id, nomeCompleto: 'Dr. Silva' });
    expect(body.imagens).toHaveLength(2);
    for (const img of body.imagens) {
      expect(img.url).toContain('X-Amz-Signature');
      expect(img.resultadoIa).not.toBeNull();
    }
  });

  it('permite ADMIN ver exame de qualquer médico', async () => {
    const dono = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(dono.id).build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });
    expect(res.statusCode).toBe(200);
  });

  it('retorna comorbidades estruturadas quando exame possui registro', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(medico.id).build();
    await ComorbidadeBuilder.aComorbidade(exame.id)
      .with({
        diabetes: true,
        diabetesAnos: 8,
        diabetesUsoInsulina: true,
        hipertensao: true,
        outrasComorbidades: true,
        outrasComorbidadesDescricao: 'Asma',
      })
      .build();

    authSpies.authenticateAs(medico);
    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.comorbidades).toMatchObject({
      diabetes: true,
      diabetesAnos: 8,
      diabetesUsoInsulina: true,
      hipertensao: true,
      outrasComorbidades: true,
      outrasComorbidadesDescricao: 'Asma',
      qualidadeTecnicaDificuldade: false,
    });
  });

  it('retorna comorbidades null quando exame não possui registro', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const exame = await ExameBuilder.anExame().withIdUsuario(medico.id).build();

    authSpies.authenticateAs(medico);
    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().comorbidades).toBeNull();
  });

  it('em ERRO_PROCESSAMENTO devolve imagens com resultadoIa null', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const exame = await ExameBuilder.anExame()
      .withIdUsuario(medico.id)
      .withStatus(ExameStatus.ERRO_PROCESSAMENTO)
      .build();
    await ImagemBuilder.anImagem().withIdExame(exame.id).build();
    authSpies.authenticateAs(medico);

    const res = await app.inject({ method: 'GET', url: `/api/exams/${exame.id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ERRO_PROCESSAMENTO');
    expect(body.imagens.every((i: { resultadoIa: unknown }) => i.resultadoIa === null)).toBe(true);
  });
});
