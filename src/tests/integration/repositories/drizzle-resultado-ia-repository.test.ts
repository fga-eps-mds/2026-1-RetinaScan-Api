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
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

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

  describe('getDiagnosisMetrics', () => {
    async function seedResultado(
      label: string,
      confidence: number,
      dtHora: Date,
    ): Promise<void> {
      const exame = await ExameBuilder.anExame().withDtHora(dtHora).build();
      const img = await ImagemBuilder.anImagem()
        .withIdExame(exame.id)
        .withLateralidadeOlho(LateralidadeOlho.OD)
        .build();
      await ResultadoIaBuilder.aResultadoIa()
        .withIdImagem(img.id)
        .withPredictedLabel(label)
        .withConfidence(confidence)
        .build();
    }

    async function seedResultadoForMedico(
      idUsuario: string,
      label: string,
      confidence: number,
    ): Promise<void> {
      const exame = await ExameBuilder.anExame()
        .withIdUsuario(idUsuario)
        .withDtHora(new Date('2026-06-01T10:00:00.000Z'))
        .build();
      const img = await ImagemBuilder.anImagem()
        .withIdExame(exame.id)
        .withLateralidadeOlho(LateralidadeOlho.OD)
        .build();
      await ResultadoIaBuilder.aResultadoIa()
        .withIdImagem(img.id)
        .withPredictedLabel(label)
        .withConfidence(confidence)
        .build();
    }

    it('should aggregate label distribution, total and average confidence', async () => {
      await seedResultado('normal', 0.9, new Date('2026-06-01T10:00:00.000Z'));
      await seedResultado('normal', 0.8, new Date('2026-06-02T10:00:00.000Z'));
      await seedResultado('abnormal', 0.7, new Date('2026-06-03T10:00:00.000Z'));

      const metrics = await repository.getDiagnosisMetrics({});

      expect(metrics.totalResultados).toBe(3);
      expect(metrics.confiancaMedia).toBeCloseTo(0.8, 5);
      expect(metrics.porDiagnostico).toEqual(
        expect.arrayContaining([
          { label: 'normal', total: 2 },
          { label: 'abnormal', total: 1 },
        ]),
      );
      expect(metrics.porDiagnostico).toHaveLength(2);
    });

    it('should filter by dtHora of the related exam', async () => {
      await seedResultado('normal', 0.9, new Date('2026-05-20T10:00:00.000Z'));
      await seedResultado('abnormal', 0.6, new Date('2026-06-15T10:00:00.000Z'));

      const metrics = await repository.getDiagnosisMetrics({
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-30T23:59:59.999Z'),
      });

      expect(metrics.totalResultados).toBe(1);
      expect(metrics.porDiagnostico).toEqual([{ label: 'abnormal', total: 1 }]);
      expect(metrics.confiancaMedia).toBeCloseTo(0.6, 5);
    });

    it('should return empty distribution and zero confidence when there are no results', async () => {
      const metrics = await repository.getDiagnosisMetrics({});

      expect(metrics.totalResultados).toBe(0);
      expect(metrics.porDiagnostico).toEqual([]);
      expect(metrics.confiancaMedia).toBe(0);
    });

    it('should aggregate only results from exams of the given idUsuario', async () => {
      const medico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();
      const outroMedico = await UsuarioBuilder.anUser().withTipoPerfil('MEDICO').build();

      await seedResultadoForMedico(medico.id, 'normal', 0.9);
      await seedResultadoForMedico(medico.id, 'abnormal', 0.7);
      await seedResultadoForMedico(outroMedico.id, 'normal', 0.5);

      const metrics = await repository.getDiagnosisMetrics({ idUsuario: medico.id });

      expect(metrics.totalResultados).toBe(2);
      expect(metrics.confiancaMedia).toBeCloseTo(0.8, 5);
      expect(metrics.porDiagnostico).toEqual(
        expect.arrayContaining([
          { label: 'normal', total: 1 },
          { label: 'abnormal', total: 1 },
        ]),
      );
      expect(metrics.porDiagnostico).toHaveLength(2);
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
