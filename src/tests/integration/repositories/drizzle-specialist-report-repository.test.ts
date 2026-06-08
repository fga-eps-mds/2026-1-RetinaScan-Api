import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { exam, specialistReport, usuario } from '@/infra/database/drizzle/schema';
import { NotFoundError } from '@/shared/errors';
import { DrizzleSpecialistReportRepository } from '@/infra/database/drizzle/repositories/drizzle-specialist-report-repository';

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
        html: '<p>Laudo final</p>',
        conteudo: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Laudo final' }] }],
        },
        resultadoIaValido: true,
      });

      const found = await repository.findByExamId(exame.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.examId).toBe(exame.id);
      expect(found?.specialistId).toBe(specialist.id);
      expect(found?.texto).toBe('Laudo final');
      expect(found?.html).toBe('<p>Laudo final</p>');
      expect(found?.resultadoIaValido).toBe(true);

      // Correção: Parse do JSON retornado e uso de toEqual para evitar problema de ordem das chaves
      expect(JSON.parse(found?.conteudo as string)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Laudo final' }] }],
      });

      expect(found?.specialist).toEqual({
        id: specialist.id,
        nomeCompleto: specialist.nomeCompleto,
      });
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

      const conteudo = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Laudo do especialista' }],
          },
        ],
      };

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Laudo do especialista',
        html: '<p>Laudo do especialista</p>',
        conteudo,
        resultadoIaValido: true,
      });

      expect(created.id).toBeDefined();
      expect(created.examId).toBe(exame.id);
      expect(created.specialistId).toBe(specialist.id);
      expect(created.texto).toBe('Laudo do especialista');
      expect(created.html).toBe('<p>Laudo do especialista</p>');
      expect(created.resultadoIaValido).toBe(true);

      // Correção: Parse do JSON retornado
      expect(JSON.parse(created.conteudo)).toEqual(conteudo);

      const [row] = await db
        .select()
        .from(specialistReport)
        .where(eq(specialistReport.examId, exame.id));

      expect(row).toBeDefined();
      expect(row.examId).toBe(exame.id);
      expect(row.specialistId).toBe(specialist.id);
      expect(row.texto).toBe('Laudo do especialista');
      expect(row.html).toBe('<p>Laudo do especialista</p>');
      expect(row.resultadoIaValido).toBe(true);
      // Aqui no banco já vem como objeto, toEqual resolve o problema
      expect(row.conteudo).toEqual(conteudo);
    });

    it('should persist false when resultadoIaValido is false', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Laudo com IA inválida',
        html: '<p>Laudo com IA inválida</p>',
        conteudo: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Laudo com IA inválida' }],
            },
          ],
        },
        resultadoIaValido: false,
      });

      expect(created.resultadoIaValido).toBe(false);

      const found = await repository.findByExamId(exame.id);
      expect(found?.resultadoIaValido).toBe(false);
    });
  });

  describe('update', () => {
    it('should update the report when the report id exists', async () => {
      const specialist = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame().withIdUsuario(specialist.id).build();

      const created = await repository.create({
        examId: exame.id,
        especialistId: specialist.id,
        texto: 'Texto antigo',
        html: '<p>Texto antigo</p>',
        conteudo: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Texto antigo' }],
            },
          ],
        },
        resultadoIaValido: true,
      });

      const novoConteudo = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Texto novo' }],
          },
        ],
      };

      const updated = await repository.update(created.id, {
        texto: 'Texto novo',
        html: '<p>Texto novo</p>',
        conteudo: novoConteudo,
        resultadoIaValido: false,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.examId).toBe(exame.id);
      expect(updated.specialistId).toBe(specialist.id);
      expect(updated.texto).toBe('Texto novo');
      expect(updated.html).toBe('<p>Texto novo</p>');
      expect(updated.resultadoIaValido).toBe(false);

      // Correção: Parse do JSON retornado
      expect(JSON.parse(updated.conteudo)).toEqual(novoConteudo);

      const found = await repository.findByExamId(exame.id);
      expect(found?.texto).toBe('Texto novo');
      expect(found?.html).toBe('<p>Texto novo</p>');
      expect(found?.resultadoIaValido).toBe(false);

      // Correção: Parse do JSON retornado
      expect(JSON.parse(found?.conteudo as string)).toEqual(novoConteudo);
    });

    it('should throw NotFoundError when report does not exist', async () => {
      await expect(
        repository.update(randomUUID(), {
          texto: 'Texto novo',
          html: '<p>Texto novo</p>',
          conteudo: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Texto novo' }],
              },
            ],
          },
          resultadoIaValido: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
