import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { exam, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleExamesRepository } from '@/infra/database/drizzle/repositories/drizzle-exame-repository';
import { ExameStatus, Sexo } from '@/modules/exam/exam';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

describe('DrizzleExamesRepository (integration)', () => {
  const repository = new DrizzleExamesRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
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
      expect(created.comorbidades).toBe('Diabetes');
      expect(created.descricao).toBe('Exame de rotina');

      const [row] = await db.select().from(exam).where(eq(exam.idExame, created.id));
      expect(row.idUsuario).toBe(user.id);
      expect(row.nomeCompleto).toBe('Fulano de Tal');
      expect(row.comorbidades).toBe('Diabetes');
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
    });
  });
});
