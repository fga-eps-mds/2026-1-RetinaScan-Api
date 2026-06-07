import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { DrizzleSpecialistReportRepository } from '@/infra/database/drizzle/repositories/drizzle-specialist-report-repository';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { exam, specialistReport, usuario } from '@/infra/database/drizzle/schema';

describe('DrizzleSpecialistReportRepository (integration)', () => {
  const repository = new DrizzleSpecialistReportRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${specialistReport} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  describe('findByExamId', () => {
    it('should return the report when the exam id exists', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Laudo final',
        resultadoIaValido: true,
      });

      const found = await repository.findByExamId(exame.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.examId).toBe(exame.id);
      expect(found?.specialistId).toBe(specialist.id);
      expect(found?.texto).toBe('Laudo final');
      expect(found?.resultadoIaValido).toBe(true);
    });

    it('should return null when the exam id does not exist', async () => {
      const found = await repository.findByExamId(randomUUID());

      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    it('should create the report with mapped fields', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Laudo do especialista',
        resultadoIaValido: true,
      });

      expect(created.id).toBeDefined();
      expect(created.examId).toBe(exame.id);
      expect(created.specialistId).toBe(specialist.id);
      expect(created.texto).toBe('Laudo do especialista');
      expect(created.resultadoIaValido).toBe(true);

      const [row] = await db
        .select()
        .from(specialistReport)
        .where(eq(specialistReport.examId, exame.id));

      expect(row).toBeDefined();
      expect(row.examId).toBe(exame.id);
      expect(row.specialistId).toBe(specialist.id);
      expect(row.texto).toBe('Laudo do especialista');
      expect(row.resultadoIaValido).toBe(true);
    });

    it('should persist false when resultadoIaValido is false', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Laudo com IA inválida',
        resultadoIaValido: false,
      });

      expect(created.resultadoIaValido).toBe(false);

      const found = await repository.findByExamId(exame.id);
      expect(found?.resultadoIaValido).toBe(false);
    });
  });

  describe('update', () => {
    it('should update the report when the exam id exists', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Texto antigo',
        resultadoIaValido: true,
      });

      const updated = await repository.update(exame.id, {
        texto: 'Texto novo',
        resultadoIaValido: false,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.examId).toBe(exame.id);
      expect(updated.specialistId).toBe(specialist.id);
      expect(updated.texto).toBe('Texto novo');
      expect(updated.resultadoIaValido).toBe(false);

      const found = await repository.findByExamId(exame.id);
      expect(found?.texto).toBe('Texto novo');
      expect(found?.resultadoIaValido).toBe(false);
    });
  });
});
