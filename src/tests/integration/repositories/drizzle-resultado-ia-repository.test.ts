import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { DrizzleResultadoIaRepository } from '@/infra/database/drizzle/repositories/drizzle-resultado-ia-repository';
import { exam, imagem, resultadoIa, usuario } from '@/infra/database/drizzle/schema';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import type { ResultadoIa } from '@/modules/exam/resultado-ia';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ImagemBuilder } from '@/tests/helpers/builders/imagem-builder';
import { ResultadoIaBuilder } from '@/tests/helpers/builders/resultado-ia-builder';

describe('DrizzleResultadoIaRepository (integration)', () => {
  const repository = new DrizzleResultadoIaRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${resultadoIa} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  function buildResultado(idImagem: string, overrides: Partial<ResultadoIa> = {}): ResultadoIa {
    return {
      id: randomUUID(),
      idImagem,
      predictedClass: 0,
      predictedLabel: 'normal',
      confidence: 0.95,
      probabilities: { normal: 0.95, abnormal: 0.05 },
      ...overrides,
    };
  }

  describe('createMany', () => {
    it('should persist multiple results', async () => {
      const exame = await ExameBuilder.anExame().build();
      const imgOd = await ImagemBuilder.anImagem()
        .withIdExame(exame.id)
        .withLateralidadeOlho(LateralidadeOlho.OD)
        .build();
      const imgOe = await ImagemBuilder.anImagem()
        .withIdExame(exame.id)
        .withLateralidadeOlho(LateralidadeOlho.OE)
        .build();

      await repository.createMany({
        resultados: [buildResultado(imgOd.id), buildResultado(imgOe.id)],
      });

      const persisted = await repository.findByExamId({ examId: exame.id });
      expect(persisted).toHaveLength(2);
    });

    it('should early-return when resultados array is empty', async () => {
      await repository.createMany({ resultados: [] });

      const rows = await db.select().from(resultadoIa);
      expect(rows).toEqual([]);
    });
  });

  describe('unique idImagem', () => {
    it('should reject two results for the same imagem', async () => {
      const exame = await ExameBuilder.anExame().build();
      const img = await ImagemBuilder.anImagem().withIdExame(exame.id).build();

      await repository.createMany({ resultados: [buildResultado(img.id)] });

      await expect(
        repository.createMany({ resultados: [buildResultado(img.id)] }),
      ).rejects.toThrow();
    });
  });

  describe('existsByExamId', () => {
    it('should return false when exam has no results', async () => {
      const exame = await ExameBuilder.anExame().build();
      await ImagemBuilder.anImagem().withIdExame(exame.id).build();

      const result = await repository.existsByExamId({ examId: exame.id });
      expect(result).toBe(false);
    });

    it('should return true when exam has at least one result', async () => {
      const exame = await ExameBuilder.anExame().build();
      const img = await ImagemBuilder.anImagem().withIdExame(exame.id).build();
      await ResultadoIaBuilder.aResultadoIa().withIdImagem(img.id).build();

      const result = await repository.existsByExamId({ examId: exame.id });
      expect(result).toBe(true);
    });

    it('should return false for an exam without related images/results', async () => {
      const exameA = await ExameBuilder.anExame().build();
      const exameB = await ExameBuilder.anExame().build();
      const imgA = await ImagemBuilder.anImagem().withIdExame(exameA.id).build();
      await ResultadoIaBuilder.aResultadoIa().withIdImagem(imgA.id).build();

      const result = await repository.existsByExamId({ examId: exameB.id });
      expect(result).toBe(false);
    });
  });

  describe('findByExamId', () => {
    it('should return empty array when exam has no results', async () => {
      const exame = await ExameBuilder.anExame().build();
      const result = await repository.findByExamId({ examId: exame.id });
      expect(result).toEqual([]);
    });

    it('should return only results from images of the given exam', async () => {
      const exameA = await ExameBuilder.anExame().build();
      const exameB = await ExameBuilder.anExame().build();

      const imgA1 = await ImagemBuilder.anImagem()
        .withIdExame(exameA.id)
        .withLateralidadeOlho(LateralidadeOlho.OD)
        .build();
      const imgA2 = await ImagemBuilder.anImagem()
        .withIdExame(exameA.id)
        .withLateralidadeOlho(LateralidadeOlho.OE)
        .build();
      const imgB = await ImagemBuilder.anImagem().withIdExame(exameB.id).build();

      await repository.createMany({
        resultados: [
          buildResultado(imgA1.id, {
            predictedClass: 1,
            predictedLabel: 'abnormal',
            confidence: 0.87,
            probabilities: { normal: 0.13, abnormal: 0.87 },
          }),
          buildResultado(imgA2.id),
          buildResultado(imgB.id),
        ],
      });

      const result = await repository.findByExamId({ examId: exameA.id });
      expect(result).toHaveLength(2);
      const imagemIds = result.map((r) => r.idImagem).sort();
      expect(imagemIds).toEqual([imgA1.id, imgA2.id].sort());

      const abnormal = result.find((r) => r.idImagem === imgA1.id);
      expect(abnormal?.predictedClass).toBe(1);
      expect(abnormal?.predictedLabel).toBe('abnormal');
      expect(abnormal?.confidence).toBeCloseTo(0.87, 4);
      expect(abnormal?.probabilities).toEqual({ normal: 0.13, abnormal: 0.87 });
    });
  });
});
