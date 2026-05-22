import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, imagem, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleExamesRepository } from '@/infra/database/drizzle/repositories/drizzle-exame-repository';
import { ExameStatus, Sexo } from '@/modules/exam/exam';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';

describe('DrizzleExamesRepository (integration)', () => {
  const repository = new DrizzleExamesRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${imagem} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${exam} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  describe('create', () => {
    it('should persist the exam and return the stored data', async () => {
      const user = await UsuarioBuilder.anUser().build();
      const dtHora = new Date('2026-04-24T10:00:00.000Z');

      const created = await repository.create({
        id: randomUUID(),
        idUsuario: user.id,
        nomeCompleto: 'Fulano de Tal',
        cpf: cpfUtil.generate(),
        sexo: Sexo.MASCULINO,
        dtNascimento: '1990-01-01',
        dtHora,
        status: ExameStatus.CRIADO,
        comorbidades: 'Diabetes',
        descricao: 'Exame de rotina',
      });

      expect(created.idUsuario).toBe(user.id);
      expect(created.nomeCompleto).toBe('Fulano de Tal');
      expect(created.status).toBe(ExameStatus.CRIADO);
      expect(created.olho).toBeNull();

      const [row] = await db.select().from(exam).where(eq(exam.idExame, created.id));
      expect(row.olho).toBeNull();
    });

    it('should persist nullable fields as null when not provided', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.create({
        id: randomUUID(),
        idUsuario: user.id,
        nomeCompleto: 'Ciclano',
        cpf: cpfUtil.generate(),
        sexo: Sexo.FEMININO,
        dtNascimento: '1985-05-10',
        dtHora: new Date(),
        status: ExameStatus.CRIADO,
      });

      expect(created.comorbidades).toBeNull();
      expect(created.descricao).toBeNull();
      expect(created.olho).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return the exam by id including olho', async () => {
      const exame = await ExameBuilder.anExame().withOlho('AO').build();

      const found = await repository.findOne({ examId: exame.id });

      expect(found?.id).toBe(exame.id);
      expect(found?.olho).toBe('AO');
    });

    it('should return null when exam does not exist', async () => {
      const found = await repository.findOne({ examId: randomUUID() });
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update only the provided fields of the target exam', async () => {
      const exame = await ExameBuilder.anExame().build();
      const other = await ExameBuilder.anExame().build();

      await repository.update({ examId: exame.id, data: { olho: 'AO' } });

      const [updated] = await db.select().from(exam).where(eq(exam.idExame, exame.id));
      const [untouched] = await db.select().from(exam).where(eq(exam.idExame, other.id));
      expect(updated.olho).toBe('AO');
      expect(updated.status).toBe(exame.status);
      expect(untouched.olho).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const exame = await ExameBuilder.anExame().build();

      await repository.update({
        examId: exame.id,
        data: { olho: 'OD', status: 'CONCLUIDO' },
      });

      const [updated] = await db.select().from(exam).where(eq(exam.idExame, exame.id));
      expect(updated.olho).toBe('OD');
      expect(updated.status).toBe('CONCLUIDO');
    });

    it('should be a noop when data is empty', async () => {
      const exame = await ExameBuilder.anExame().withOlho('OD').build();

      await repository.update({ examId: exame.id, data: {} });

      const [unchanged] = await db.select().from(exam).where(eq(exam.idExame, exame.id));
      expect(unchanged.olho).toBe('OD');
    });
  });

  describe('findMany', () => {
    it('should return only exams from the provided idUsuario', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      const outroMedico = await UsuarioBuilder.anUser().build();

      await ExameBuilder.anExame().withIdUsuario(medico.id).build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).build();
      await ExameBuilder.anExame().withIdUsuario(outroMedico.id).build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should project list items with id, nomeCompleto, status, dtCriacao and olho read straight from the column', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      const exame = await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withNomeCompleto('Maria Silva')
        .withStatus(ExameStatus.CRIADO)
        .withOlho('AO')
        .build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.data).toHaveLength(1);
      const [item] = result.data;
      expect(item.id).toBe(exame.id);
      expect(item.nomeCompleto).toBe('Maria Silva');
      expect(item.status).toBe(ExameStatus.CRIADO);
      expect(item.olho).toBe('AO');
      expect(item.dtCriacao).toBeInstanceOf(Date);
    });

    it('should return olho as null when the exam has no olho set', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).withOlho(null).build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.data[0].olho).toBeNull();
    });

    it('should filter by exact cpf within the doctor scope', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      const targetCpf = cpfUtil.generate();
      await ExameBuilder.anExame().withIdUsuario(medico.id).withCpf(targetCpf).build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id, cpf: targetCpf },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by name with case-insensitive partial match', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).withNomeCompleto('Maria Silva').build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withNomeCompleto('Mariana Souza')
        .build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).withNomeCompleto('João Pedro').build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id, nomeCompleto: 'mari' },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(2);
      expect(result.data.map((e) => e.nomeCompleto).sort()).toEqual([
        'Maria Silva',
        'Mariana Souza',
      ]);
    });

    it('should respect page and pageSize', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      for (let i = 0; i < 5; i++) {
        await ExameBuilder.anExame().withIdUsuario(medico.id).build();
      }

      const firstPage = await repository.findMany({
        filters: { idUsuario: medico.id },
        pagination: { page: 1, pageSize: 2 },
      });
      const thirdPage = await repository.findMany({
        filters: { idUsuario: medico.id },
        pagination: { page: 3, pageSize: 2 },
      });

      expect(firstPage.total).toBe(5);
      expect(firstPage.data).toHaveLength(2);
      expect(thirdPage.data).toHaveLength(1);
    });

    it('should filter by status within the doctor scope', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withStatus(ExameStatus.CRIADO)
        .build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withStatus(ExameStatus.CONCLUIDO)
        .build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withStatus(ExameStatus.CONCLUIDO)
        .build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withStatus(ExameStatus.EM_PROCESSAMENTO)
        .build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id, status: ExameStatus.CONCLUIDO },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((e) => e.status === ExameStatus.CONCLUIDO)).toBe(true);
    });

    it('should return empty data when no exam matches the status filter', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      await ExameBuilder.anExame()
        .withIdUsuario(medico.id)
        .withStatus(ExameStatus.CRIADO)
        .build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id, status: ExameStatus.CONCLUIDO },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should return empty data when no exam matches filters', async () => {
      const medico = await UsuarioBuilder.anUser().build();
      await ExameBuilder.anExame().withIdUsuario(medico.id).build();

      const result = await repository.findMany({
        filters: { idUsuario: medico.id, cpf: cpfUtil.generate() },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
