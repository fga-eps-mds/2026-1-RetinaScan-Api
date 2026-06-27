import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, resultadoIa, usuario } from '@/infra/database/drizzle/schema';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ImagemBuilder } from '@/tests/helpers/builders/imagem-builder';
import { ResultadoIaBuilder } from '@/tests/helpers/builders/resultado-ia-builder';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';
import { buildApp } from '@/api/index';

describe('GET /api/exams/metrics (integration)', () => {
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
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return 401 when not authenticated', async () => {
    authSpies.unauthenticate();

    const res = await app.inject({ method: 'GET', url: '/api/exams/metrics' });

    expect(res.statusCode).toBe(401);
  });

  it('should return aggregated metrics for an admin', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const exameA = await ExameBuilder.anExame()
      .withStatus('CONCLUIDO')
      .withDtHora(new Date('2026-06-01T10:00:00.000Z'))
      .build();
    await ExameBuilder.anExame()
      .withStatus('CRIADO')
      .withDtHora(new Date('2026-06-02T10:00:00.000Z'))
      .build();

    const img = await ImagemBuilder.anImagem()
      .withIdExame(exameA.id)
      .withLateralidadeOlho(LateralidadeOlho.OD)
      .build();
    await ResultadoIaBuilder.aResultadoIa()
      .withIdImagem(img.id)
      .withPredictedLabel('normal')
      .withConfidence(0.9)
      .build();

    const res = await app.inject({ method: 'GET', url: '/api/exams/metrics' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.volume.total).toBe(2);
    expect(body.volume.porStatus).toEqual({
      CRIADO: 1,
      CONCLUIDO: 1,
      EM_PROCESSAMENTO: 0,
      ERRO_PROCESSAMENTO: 0,
    });
    expect(body.volume.serieTemporal).toEqual([
      { data: '2026-06-01', total: 1 },
      { data: '2026-06-02', total: 1 },
    ]);
    expect(body.resultadosIa.totalResultados).toBe(1);
    expect(body.resultadosIa.porDiagnostico).toEqual([{ label: 'normal', total: 1 }]);
    expect(body.resultadosIa.confiancaMedia).toBeCloseTo(0.9, 5);
  });

  it('should filter by period', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    await ExameBuilder.anExame().withDtHora(new Date('2026-05-01T10:00:00.000Z')).build();
    await ExameBuilder.anExame().withDtHora(new Date('2026-06-15T10:00:00.000Z')).build();

    const res = await app.inject({
      method: 'GET',
      url: '/api/exams/metrics?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().volume.total).toBe(1);
  });

  it('should return 400 when startDate is after endDate', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({
      method: 'GET',
      url: '/api/exams/metrics?startDate=2026-06-30T00:00:00.000Z&endDate=2026-06-01T00:00:00.000Z',
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 on unknown query field', async () => {
    const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
    authSpies.authenticateAs(admin);

    const res = await app.inject({ method: 'GET', url: '/api/exams/metrics?foo=bar' });

    expect(res.statusCode).toBe(400);
  });

  it('should scope volume and IA metrics to the logged-in medico', async () => {
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    const outroMedico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(medico);

    const meu = await ExameBuilder.anExame()
      .withIdUsuario(medico.id)
      .withStatus('CONCLUIDO')
      .withDtHora(new Date('2026-06-01T10:00:00.000Z'))
      .build();
    const dele = await ExameBuilder.anExame()
      .withIdUsuario(outroMedico.id)
      .withStatus('CONCLUIDO')
      .withDtHora(new Date('2026-06-01T10:00:00.000Z'))
      .build();

    const img = await ImagemBuilder.anImagem()
      .withIdExame(meu.id)
      .withLateralidadeOlho(LateralidadeOlho.OD)
      .build();
    await ResultadoIaBuilder.aResultadoIa()
      .withIdImagem(img.id)
      .withPredictedLabel('normal')
      .withConfidence(0.9)
      .build();

    const imgDele = await ImagemBuilder.anImagem()
      .withIdExame(dele.id)
      .withLateralidadeOlho(LateralidadeOlho.OD)
      .build();
    await ResultadoIaBuilder.aResultadoIa()
      .withIdImagem(imgDele.id)
      .withPredictedLabel('abnormal')
      .withConfidence(0.5)
      .build();

    const res = await app.inject({ method: 'GET', url: '/api/exams/metrics' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.volume.total).toBe(1);
    expect(body.resultadosIa.totalResultados).toBe(1);
  });

  it('should let especialista see global metrics (not scoped)', async () => {
    const especialista = await UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').build();
    const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
    authSpies.authenticateAs(especialista);

    await ExameBuilder.anExame().withIdUsuario(medico.id).build();
    await ExameBuilder.anExame().withIdUsuario(medico.id).build();

    const res = await app.inject({ method: 'GET', url: '/api/exams/metrics' });

    expect(res.statusCode).toBe(200);
    expect(res.json().volume.total).toBe(2);
  });
});
