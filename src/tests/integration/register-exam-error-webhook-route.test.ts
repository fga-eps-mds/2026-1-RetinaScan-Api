import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, examIaError, imagem, resultadoIa, usuario } from '@/infra/database/drizzle/schema';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ExamIaErrorBuilder } from '@/tests/helpers/builders/exam-ia-error-builder';
import { ExameStatus } from '@/modules/exam/exam';
import { buildApp } from '@/api/index';
import { container } from '@/infra/container';
import { NotificationService } from '@/modules/notification/services';
import { asValue } from 'awilix';

interface WebhookErrorPayload {
  exam_id: string;
  error: string;
  task_id?: string;
  task_name?: string;
  traceback?: string;
  args?: Record<string, unknown>;
}

function makeErrorBody(
  examId: string,
  overrides: Partial<WebhookErrorPayload> = {},
): WebhookErrorPayload {
  return {
    exam_id: examId,
    error: "TimeoutError('Connection timed out')",
    task_id: '8f2f4b6e-9b8a-4d6c-a4c2-8d6d7a9d1234',
    task_name: 'process_exam_task',
    traceback:
      'Traceback (most recent call last):\n  File "/app/tasks.py", line 42, in process_exam_task\n    response = external_service.call()\nTimeoutError: Connection timed out',
    args: { exam_id: examId, user_id: 'abc-999', priority: 'high' },
    ...overrides,
  };
}

describe('POST /api/exams/:examId/webhook/error (integration)', () => {
  let app: FastifyInstance;
  let notificarSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    await connectDatabase();

    vi.doMock('@/modules/notifications/services/notification-service', () => {
      const mockService = {
        notificar: vi.fn().mockResolvedValue(undefined),
      };
      notificarSpy = mockService.notificar;
      return { NotificationService: mockService as unknown as typeof NotificationService };
    });

    container.register({
      notificationService: asValue({
        notificar: vi.fn().mockResolvedValue(undefined),
      }),
    });

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${examIaError} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${resultadoIa} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);

    notificarSpy?.mockClear();
  });

  it('returns 204, marks exam as ERRO_PROCESSAMENTO and persists error row on happy path', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).build();
    const body = makeErrorBody(exame.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: body,
    });

    if (res.statusCode !== 204) {
      console.error('Unexpected response:', res.statusCode, res.body);
    }

    expect(res.statusCode).toBe(204);

    const [examRow] = await db.select().from(exam).where(eq(exam.idExame, exame.id));
    expect(examRow.status).toBe(ExameStatus.ERRO_PROCESSAMENTO);

    const errorRows = await db.select().from(examIaError);
    expect(errorRows).toHaveLength(1);
    expect(errorRows[0].idExame).toBe(exame.id);
    expect(errorRows[0].errorMessage).toBe(body.error);
    expect(errorRows[0].taskId).toBe(body.task_id);
    expect(errorRows[0].taskName).toBe(body.task_name);
    expect(errorRows[0].traceback).toBe(body.traceback);
    expect(errorRows[0].args).toEqual(body.args);
  });

  it('returns 204 and persists null for omitted optional fields', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).build();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: { exam_id: exame.id, error: 'minimal failure' },
    });

    if (res.statusCode !== 204) {
      console.error('Unexpected response:', res.statusCode, res.body);
    }

    expect(res.statusCode).toBe(204);

    const errorRows = await db.select().from(examIaError);
    expect(errorRows).toHaveLength(1);
    expect(errorRows[0].errorMessage).toBe('minimal failure');
    expect(errorRows[0].traceback).toBeNull();
    expect(errorRows[0].taskId).toBeNull();
    expect(errorRows[0].taskName).toBeNull();
    expect(errorRows[0].args).toBeNull();
  });

  it('returns 400 when body has no error field', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).build();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: { exam_id: exame.id },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when exam_id in body diverges from path', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).build();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: makeErrorBody(randomUUID()),
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when examId in path is not a valid UUID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/not-a-uuid/webhook/error`,
      payload: { exam_id: 'not-a-uuid', error: 'x' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when exam does not exist', async () => {
    const missingExamId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${missingExamId}/webhook/error`,
      payload: makeErrorBody(missingExamId),
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when exam is already CONCLUIDO', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.CONCLUIDO).build();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: makeErrorBody(exame.id),
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 409 when exam already has an error registered', async () => {
    const exame = await ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).build();
    await ExamIaErrorBuilder.anExamIaError().withIdExame(exame.id).build();

    const res = await app.inject({
      method: 'POST',
      url: `/api/exams/${exame.id}/webhook/error`,
      payload: makeErrorBody(exame.id),
    });

    expect(res.statusCode).toBe(409);
  });
});
