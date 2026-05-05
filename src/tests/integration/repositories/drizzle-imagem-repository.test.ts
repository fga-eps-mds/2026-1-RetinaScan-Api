import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleImagemRepository } from '@/infra/database/drizzle/repositories/drizzle-imagem-repository';
import { DrizzleExamesRepository } from '@/infra/database/drizzle/repositories/drizzle-exame-repository';
import { ExameStatus, Sexo } from '@/modules/exam/exam';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

describe('DrizzleImagemRepository (integration)', () => {
  const repository = new DrizzleImagemRepository();
  const examesRepository = new DrizzleExamesRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  async function createExam() {
    const user = await UsuarioBuilder.anUser().build();
    return examesRepository.create({
      id: randomUUID(),
      idUsuario: user.id,
      nomeCompleto: 'Fulano de Tal',
      cpf: cpfUtil.generate(),
      sexo: Sexo.MASCULINO,
      dtNascimento: '1990-01-01',
      dtHora: new Date(),
      status: ExameStatus.CRIADO,
    });
  }

  describe('createMany', () => {
    it('should persist multiple images and return them', async () => {
      const exame = await createExam();

      const created = await repository.createMany([
        {
          id: randomUUID(),
          idExame: exame.id,
          lateralidadeOlho: LateralidadeOlho.OD,
          caminhoImg: `exams/${exame.id}/od.png`,
          qualidadeImg: 'Pendente',
        },
        {
          id: randomUUID(),
          idExame: exame.id,
          lateralidadeOlho: LateralidadeOlho.OE,
          caminhoImg: `exams/${exame.id}/oe.png`,
          qualidadeImg: 'Pendente',
        },
      ]);

      expect(created).toHaveLength(2);
      expect(created[0].caminhoImg).toContain(exame.id);

      const persisted = await repository.findMany({ examId: exame.id });
      expect(persisted).toHaveLength(2);
    });

    it('should return empty array when no images are provided', async () => {
      const result = await repository.createMany([]);
      expect(result).toEqual([]);
    });
  });

  describe('findMany', () => {
    it('should return empty array when exam has no images', async () => {
      const exame = await createExam();
      const result = await repository.findMany({ examId: exame.id });
      expect(result).toEqual([]);
    });

    it('should return only images of the given exam', async () => {
      const exameA = await createExam();
      const exameB = await createExam();

      await repository.createMany([
        {
          id: randomUUID(),
          idExame: exameA.id,
          lateralidadeOlho: LateralidadeOlho.OD,
          caminhoImg: `exams/${exameA.id}/od.png`,
          qualidadeImg: 'Pendente',
        },
        {
          id: randomUUID(),
          idExame: exameB.id,
          lateralidadeOlho: LateralidadeOlho.OE,
          caminhoImg: `exams/${exameB.id}/oe.png`,
          qualidadeImg: 'Pendente',
        },
      ]);

      const result = await repository.findMany({ examId: exameA.id });
      expect(result).toHaveLength(1);
      expect(result[0].idExame).toBe(exameA.id);
      expect(result[0].lateralidadeOlho).toBe(LateralidadeOlho.OD);
    });
  });

  describe('unique (idExame, lateralidadeOlho)', () => {
    it('should reject duplicate lateralidade for the same exam', async () => {
      const exame = await createExam();

      await repository.createMany([
        {
          id: randomUUID(),
          idExame: exame.id,
          lateralidadeOlho: LateralidadeOlho.OD,
          caminhoImg: `exams/${exame.id}/od.png`,
          qualidadeImg: 'Pendente',
        },
      ]);

      await expect(
        repository.createMany([
          {
            id: randomUUID(),
            idExame: exame.id,
            lateralidadeOlho: LateralidadeOlho.OD,
            caminhoImg: `exams/${exame.id}/od-2.png`,
            qualidadeImg: 'Pendente',
          },
        ]),
      ).rejects.toThrow();
    });
  });
});
