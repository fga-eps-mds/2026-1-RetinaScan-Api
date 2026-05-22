import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { DrizzleExamIaErrorRepository } from '@/infra/database/drizzle/repositories/drizzle-exam-ia-error-repository';
import { exam, examIaError, usuario } from '@/infra/database/drizzle/schema';
import type { ExamIaError } from '@/modules/exam/exam-ia-error';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ExamIaErrorBuilder } from '@/tests/helpers/builders/exam-ia-error-builder';

describe('DrizzleExamIaErrorRepository (integration)', () => {
  const repository = new DrizzleExamIaErrorRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${examIaError} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  function buildErro(idExame: string, overrides: Partial<ExamIaError> = {}): ExamIaError {
    return {
      id: randomUUID(),
      idExame,
      errorMessage: "TimeoutError('Connection timed out')",
      traceback: 'Traceback (most recent call last):...',
      taskId: '8f2f4b6e-9b8a-4d6c-a4c2-8d6d7a9d1234',
      taskName: 'process_exam_task',
      args: { exam_id: '123456', priority: 'high' },
      dtHora: new Date(),
      ...overrides,
    };
  }

  describe('create', () => {
    it('should persist an error with all fields', async () => {
      const exame = await ExameBuilder.anExame().build();
      const erro = buildErro(exame.id);

      await repository.create({ erro });

      const rows = await db.select().from(examIaError);
      expect(rows).toHaveLength(1);
      expect(rows[0].idExame).toBe(exame.id);
      expect(rows[0].errorMessage).toBe(erro.errorMessage);
      expect(rows[0].traceback).toBe(erro.traceback);
      expect(rows[0].taskId).toBe(erro.taskId);
      expect(rows[0].taskName).toBe(erro.taskName);
      expect(rows[0].args).toEqual(erro.args);
    });

    it('should persist an error with only required fields (optionals null)', async () => {
      const exame = await ExameBuilder.anExame().build();
      const erro = buildErro(exame.id, {
        traceback: null,
        taskId: null,
        taskName: null,
        args: null,
      });

      await repository.create({ erro });

      const rows = await db.select().from(examIaError);
      expect(rows).toHaveLength(1);
      expect(rows[0].errorMessage).toBe(erro.errorMessage);
      expect(rows[0].traceback).toBeNull();
      expect(rows[0].taskId).toBeNull();
      expect(rows[0].taskName).toBeNull();
      expect(rows[0].args).toBeNull();
    });

    it('should reject a second error for the same exam (unique idExame)', async () => {
      const exame = await ExameBuilder.anExame().build();
      await repository.create({ erro: buildErro(exame.id) });

      await expect(repository.create({ erro: buildErro(exame.id) })).rejects.toThrow();
    });
  });

  describe('existsByExamId', () => {
    it('should return false when exam has no error registered', async () => {
      const exame = await ExameBuilder.anExame().build();

      const result = await repository.existsByExamId({ examId: exame.id });
      expect(result).toBe(false);
    });

    it('should return true when exam has an error registered', async () => {
      const exame = await ExameBuilder.anExame().build();
      await ExamIaErrorBuilder.anExamIaError().withIdExame(exame.id).build();

      const result = await repository.existsByExamId({ examId: exame.id });
      expect(result).toBe(true);
    });

    it('should return false for an exam without related error', async () => {
      const exameA = await ExameBuilder.anExame().build();
      const exameB = await ExameBuilder.anExame().build();
      await ExamIaErrorBuilder.anExamIaError().withIdExame(exameA.id).build();

      const result = await repository.existsByExamId({ examId: exameB.id });
      expect(result).toBe(false);
    });
  });
});
