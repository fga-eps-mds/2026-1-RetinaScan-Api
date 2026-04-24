import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories/drizzle-usuario-repository';
import { usuario } from '@/infra/database/drizzle/schema/index';

const {
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockUpdate,
  mockSet,
  mockReturning,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockReturning = vi.fn();

  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    returning: mockReturning,
  }));

  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));

  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockSet = vi.fn(() => ({
    where: mockWhere,
  }));

  const mockUpdate = vi.fn(() => ({
    set: mockSet,
  }));

  return {
    mockSelect,
    mockFrom,
    mockWhere,
    mockLimit,
    mockOrderBy,
    mockUpdate,
    mockSet,
    mockReturning,
  };
});

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

describe('DrizzleUsuariosRepository', () => {
  let repository: DrizzleUsuariosRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DrizzleUsuariosRepository();
  });

  describe('getAllUsers', () => {
    it('deve retornar todos os usuários ordenados pela data de criação', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@email.com', createdAt: new Date('2024-01-01') },
        { id: '2', email: 'user2@email.com', createdAt: new Date('2024-01-02') },
      ];

      mockOrderBy.mockResolvedValueOnce(mockUsers);

      const result = await repository.getAllUsers();

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(usuario);
      expect(mockOrderBy).toHaveBeenCalledWith(usuario.createdAt);
      expect(result).toEqual(mockUsers);
    });

    it('deve retornar uma lista vazia se não houver usuários', async () => {
      mockOrderBy.mockResolvedValueOnce([]);

      const result = await repository.getAllUsers();

      expect(mockOrderBy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar um usuário caso o email exista', async () => {
      const mockUser = { id: '1', email: 'teste@teste.com' };

      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await repository.findByEmail('teste@teste.com');

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(usuario);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('deve retornar nulo se o email não existir', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await repository.findByEmail('inexistente@teste.com');

      expect(result).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um usuário caso o cpf exista', async () => {
      const mockUser = { id: '1', cpf: '12345678900' };

      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await repository.findByCpf('12345678900');

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('deve retornar nulo se o cpf não existir', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await repository.findByCpf('00000000000');

      expect(result).toBeNull();
    });
  });

  describe('findByCrm', () => {
    it('deve retornar um usuário caso o crm exista', async () => {
      const mockUser = { id: '1', crm: '12345-DF' };

      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await repository.findByCrm('12345-DF');

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('deve retornar nulo se o crm não existir', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await repository.findByCrm('00000-DF');

      expect(result).toBeNull();
    });
  });

  describe('findBy', () => {
    it('deve retornar nulo se nenhum filtro for passado', async () => {
      const result = await repository.findBy({});

      expect(mockSelect).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('deve retornar um usuário caso passe filtros válidos', async () => {
      const mockUser = { id: '1', email: 'teste@teste.com' };

      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await repository.findBy({ email: 'teste@teste.com', id: '1' });

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('deve retornar nulo se a busca com filtros não encontrar nada', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await repository.findBy({ id: '999' });

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar o usuário e retornar os dados atualizados', async () => {
      const mockUser = { id: '1', nomeCompleto: 'Novo Nome' };

      mockReturning.mockResolvedValueOnce([mockUser]);

      const result = await repository.update('1', { nomeCompleto: 'Novo Nome' });

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(usuario);
      expect(mockSet).toHaveBeenCalledWith({ nomeCompleto: 'Novo Nome' });
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockReturning).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    it('deve retornar nulo se tentar atualizar um usuário inexistente', async () => {
      mockReturning.mockResolvedValueOnce([]);

      const result = await repository.update('999', { nomeCompleto: 'Nome' });

      expect(result).toBeNull();
    });
  });
});
