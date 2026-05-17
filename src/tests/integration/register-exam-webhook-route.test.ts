import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, resultadoIa, usuario } from '@/infra/database/drizzle/schema';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ImagemBuilder } from '@/tests/helpers/builders/imagem-builder';
import { ExameStatus } from '@/modules/exam/exam';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { buildApp } from '@/api/index';

interface WebhookResultPayload {
  filename: string;
  content_type: string;
  predicted_class: number;
  predicted_label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

interface WebhookBodyPayload {
  total_images: number;
  exam_id: string;
  results: WebhookResultPayload[];
}

interface ExamFixture {
  examId: string;
  imagemOdId: string;
  imagemOeId: string;
  caminhoOd: string;
  caminhoOe: string;
}

function makeResult(
  caminho: string,
  overrides: Partial<WebhookResultPayload> = {},
): WebhookResultPayload {
  return {
    filename: caminho,
    content_type: 'image/png',
    predicted_class: 0,
    predicted_label: 'normal',
    confidence: 0.92,
    probabilities: { normal: 0.92, alterado: 0.08 },
    ...overrides,
  };
}

function makeBody(fixture: ExamFixture, overrides: Partial<WebhookBodyPayload> = {}): WebhookBodyPayload {
  return {
    total_images: 2,
    exam_id: fixture.examId,
    results: [
      makeResult(fixture.caminhoOd),
      makeResult(fixture.caminhoOe, {
        predicted_class: 1,
        predicted_label: 'alterado',
        confidence: 0.77,
        probabilities: { normal: 0.23, alterado: 0.77 },
      }),
    ],
    ...overrides,
  };
}

async function seedExamWithBothEyes(): Promise<ExamFixture> {
  const user = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
  const exame = await ExameBuilder.anExame()
    .withIdUsuario(user.id)
    .withStatus(ExameStatus.CRIADO)
    .build();

  const odId = randomUUID();
  const oeId = randomUUID();
  const caminhoOd = `exams/${exame.id}/OD-${odId}.png`;
  const caminhoOe = `exams/${exame.id}/OE-${oeId}.png`;

  await ImagemBuilder.anImagem()
    .withId(odId)
    .withIdExame(exame.id)
    .withLateralidadeOlho(LateralidadeOlho.OD)
    .withCaminhoImg(caminhoOd)
    .build();

  await ImagemBuilder.anImagem()
    .withId(oeId)
    .withIdExame(exame.id)
    .withLateralidadeOlho(LateralidadeOlho.OE)
    .withCaminhoImg(caminhoOe)
    .build();

  return { examId: exame.id, imagemOdId: odId, imagemOeId: oeId, caminhoOd, caminhoOe };
}

describe('POST /api/exams/:examId/webhook (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${resultadoIa} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('returns 204, marks exam as CONCLUIDO and persists 2 resultadoIa rows on happy path', async () => {
    const fixture = await seedExamWithBothEyes();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: makeBody(fixture),
    });

    expect(res.statusCode).toBe(204);

    const [examRow] = await db.select().from(exam).where(eq(exam.idExame, fixture.examId));
    expect(examRow.status).toBe(ExameStatus.CONCLUIDO);

    const resultRows = await db.select().from(resultadoIa);
    expect(resultRows).toHaveLength(2);
    const imagemIds = resultRows.map((r) => r.idImagem).sort();
    expect(imagemIds).toEqual([fixture.imagemOdId, fixture.imagemOeId].sort());
  });

  it('returns 404 when exam does not exist', async () => {
    const missingExamId = randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${missingExamId}/webhook`,
      payload: {
        total_images: 0,
        exam_id: missingExamId,
        results: [],
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when webhook is called twice for the same exam', async () => {
    const fixture = await seedExamWithBothEyes();
    const body = makeBody(fixture);

    const first = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: body,
    });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: body,
    });
    expect(second.statusCode).toBe(409);
  });

  it('returns 400 when total_images is missing', async () => {
    const fixture = await seedExamWithBothEyes();
    const body = makeBody(fixture);
    const { total_images: _omit, ...invalid } = body;

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: invalid,
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when exam_id of body diverges from path', async () => {
    const fixture = await seedExamWithBothEyes();
    const body = makeBody(fixture, { exam_id: randomUUID() });

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: body,
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when filename does not match any exam image caminhoImg', async () => {
    const fixture = await seedExamWithBothEyes();
    const body = makeBody(fixture);
    body.results[0].filename = 'exams/outro/desconhecido.png';

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${fixture.examId}/webhook`,
      payload: body,
    });

    expect(res.statusCode).toBe(400);
  });
});
