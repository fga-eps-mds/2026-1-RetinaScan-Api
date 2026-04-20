import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories/drizzle-usuario-repository';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

describe('DrizzleUsuariosRepository (integration)', () => {
  const repository = new DrizzleUsuariosRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  describe('findByEmail', () => {
    it('should return the user when the email exists', async () => {
      const novo = await UsuarioBuilder.anUser().withEmail('achado@test.com').build();

      const found = await repository.findByEmail('achado@test.com');

      expect(found?.id).toBe(novo.id);
      expect(found?.email).toBe('achado@test.com');
    });

    it('should return null when the email does not exist', async () => {
      const found = await repository.findByEmail('naoexiste@test.com');

      expect(found).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('should return the user when the cpf exists', async () => {
      const novo = await UsuarioBuilder.anUser().withCpf('12345678900').build();

      const found = await repository.findByCpf('12345678900');

      expect(found?.id).toBe(novo.id);
    });

    it('should return null when the cpf does not exist', async () => {
      const found = await repository.findByCpf('99999999999');

      expect(found).toBeNull();
    });
  });

  describe('findByCrm', () => {
    it('should return the user when the crm exists', async () => {
      const novo = await UsuarioBuilder.anUser().withCrm('123456-DF').build();

      const found = await repository.findByCrm('123456-DF');

      expect(found?.id).toBe(novo.id);
    });

    it('should return null when the crm does not exist', async () => {
      const found = await repository.findByCrm('000000-SP');

      expect(found).toBeNull();
    });
  });

  describe('findBy', () => {
    it('should return the user when any of the filters match', async () => {
      const novo = await UsuarioBuilder.anUser()
        .withEmail('filtro@test.com')
        .withCpf('11122233344')
        .build();

      const found = await repository.findBy({
        email: 'outro@test.com',
        cpf: '11122233344',
      });

      expect(found?.id).toBe(novo.id);
    });

    it('should return null when no filters are provided', async () => {
      await UsuarioBuilder.anUser().build();

      const found = await repository.findBy({});

      expect(found).toBeNull();
    });

    it('should return null when nothing matches the filters', async () => {
      const novo = await UsuarioBuilder.anUser().withEmail('existente@test.com').build();

      const found = await repository.findBy({ email: 'inexistente@test.com' });

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update the user when the id exists', async () => {
      const novo = await UsuarioBuilder.anUser()
        .withNomeCompleto('Nome Antigo')
        .withEmail('antigo@test.com')
        .build();

      const updated = await repository.update(novo.id, {
        nomeCompleto: 'Nome Novo',
        email: 'novo@test.com',
      });

      expect(updated?.nomeCompleto).toBe('Nome Novo');
      expect(updated?.email).toBe('novo@test.com');
      expect(updated?.cpf).toBe(novo.cpf);
    });

    it('should return null when the id does not exist', async () => {
      const result = await repository.update('id-inexistente', {
        nomeCompleto: 'qualquer',
      });

      expect(result).toBeNull();
    });
  });
});
