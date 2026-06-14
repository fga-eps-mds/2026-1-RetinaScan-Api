import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleInscricaoMedicoRepository } from '@/infra/database/drizzle/repositories/drizzle-inscricao-medico-repository';
import { InscricaoBuilder } from '@/tests/helpers/builders/inscricao-builder';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

describe('DrizzleInscricaoMedicoRepository (integration)', () => {
  let repo: DrizzleInscricaoMedicoRepository;

  beforeAll(async () => {
    await connectDatabase();
    repo = new DrizzleInscricaoMedicoRepository();
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${inscricaoMedico} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  describe('findById', () => {
    it('should return inscricao when found', async () => {
      const inscricao = await InscricaoBuilder.aInscricao().build();
      const found = await repo.findById(inscricao.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(inscricao.id);
    });

    it('should return null when not found', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('submeter', () => {
    it('should update inscricao with form data and set status to PENDENTE', async () => {
      const inscricao = await InscricaoBuilder.aInscricao().build();

      const updated = await repo.submeter({
        id: inscricao.id,
        nomeCompleto: 'Dr. João Silva',
        cpf: '12345678900',
        crm: '123456',
        dtNascimento: '1985-03-15',
        encryptedPassword: 'encrypted:abc123',
        submittedAt: new Date('2026-06-13T10:00:00Z'),
      });

      expect(updated.status).toBe('PENDENTE');
      expect(updated.nomeCompleto).toBe('Dr. João Silva');
      expect(updated.cpf).toBe('12345678900');
      expect(updated.crm).toBe('123456');
      expect(updated.encryptedPassword).toBe('encrypted:abc123');
      expect(updated.submittedAt).toBeInstanceOf(Date);
    });
  });

  describe('avaliar', () => {
    it('should mark inscricao as APROVADA', async () => {
      const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
      const inscricao = await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();

      const updated = await repo.avaliar({
        id: inscricao.id,
        decisao: 'APROVADA',
        analisadoPor: admin.id,
        analisadoEm: new Date(),
      });

      expect(updated.status).toBe('APROVADA');
      expect(updated.analisadoPor).toBe(admin.id);
      expect(updated.analisadoEm).toBeInstanceOf(Date);
    });

    it('should mark inscricao as REJEITADA with motivo', async () => {
      const admin = await UsuarioBuilder.anUser().withTipoPerfil('ADMIN').build();
      const inscricao = await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();

      const updated = await repo.avaliar({
        id: inscricao.id,
        decisao: 'REJEITADA',
        analisadoPor: admin.id,
        analisadoEm: new Date(),
        motivoRejeicao: 'Documentação inválida',
      });

      expect(updated.status).toBe('REJEITADA');
      expect(updated.motivoRejeicao).toBe('Documentação inválida');
    });
  });

  describe('listar', () => {
    it('should return all inscricoes when no filter', async () => {
      await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();
      await InscricaoBuilder.aInscricao().withStatus('CONVITE_ENVIADO').build();

      const result = await repo.listar();
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      await InscricaoBuilder.aInscricao().withStatus('PENDENTE').build();
      await InscricaoBuilder.aInscricao().withStatus('CONVITE_ENVIADO').build();

      const result = await repo.listar({ status: 'PENDENTE' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDENTE');
    });
  });
});
