import { beforeEach, describe, expect, it, vi } from 'vitest';
import { solicitacaoStatus } from '@/modules/users/domain';
import { solicitacaoCpfCrm } from '@/infra/database/drizzle/schema';
import { DrizzleSolicitacaoCpfCrmRepository } from '@/infra/database/drizzle/repositories';

const {
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockInsert,
  mockValues,
  mockUpdate,
  mockSet,
  mockReturning,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockReturning = vi.fn();

  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
    returning: mockReturning,
  }));

  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));

  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));

  const mockInsert = vi.fn(() => ({
    values: mockValues,
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
    mockInsert,
    mockValues,
    mockUpdate,
    mockSet,
    mockReturning,
  };
});

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

describe('DrizzleSolicitacaoCpfCrmRepository', () => {
  let repository: DrizzleSolicitacaoCpfCrmRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DrizzleSolicitacaoCpfCrmRepository();
  });

  describe('criar', () => {
    it('deve criar uma solicitacao com status pendente', async () => {
      const mockSolicitacao = {
        id: 'sol-1',
        idUsuario: 'user-1',
        cpfNovo: '12345678901',
        crmNovo: 'CRM-123',
        status: solicitacaoStatus.PENDENTE,
      };

      mockReturning.mockResolvedValueOnce([mockSolicitacao]);

      const result = await repository.criar({
        idUsuario: 'user-1',
        cpfNovo: '12345678901',
        crmNovo: 'CRM-123',
      });

      expect(mockInsert).toHaveBeenCalledWith(solicitacaoCpfCrm);
      expect(mockValues).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSolicitacao);
    });
  });

  describe('findPendenteByUsuario', () => {
    it('deve retornar solicitacao pendente do usuario', async () => {
      const mockSolicitacao = { id: 'sol-1', idUsuario: 'user-1', status: solicitacaoStatus.PENDENTE };

      mockLimit.mockResolvedValueOnce([mockSolicitacao]);

      const result = await repository.findPendenteByUsuario('user-1');

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(solicitacaoCpfCrm);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSolicitacao);
    });

    it('deve retornar nulo quando nao houver pendente', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await repository.findPendenteByUsuario('user-1');

      expect(result).toBeNull();
    });
  });

  describe('listar', () => {
    it('deve listar todas as solicitacoes quando sem filtro', async () => {
      const rows = [{ id: '1' }, { id: '2' }];
      mockOrderBy.mockResolvedValueOnce(rows);

      const result = await repository.listar();

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(solicitacaoCpfCrm);
      expect(mockOrderBy).toHaveBeenCalledWith(solicitacaoCpfCrm.createdAt);
      expect(result).toEqual(rows);
    });

    it('deve listar com filtro de status e usuario', async () => {
      const rows = [{ id: '1', status: solicitacaoStatus.PENDENTE }];
      mockOrderBy.mockResolvedValueOnce(rows);

      const result = await repository.listar({
        status: solicitacaoStatus.PENDENTE,
        idUsuario: 'user-1',
      });

      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockOrderBy).toHaveBeenCalledWith(solicitacaoCpfCrm.createdAt);
      expect(result).toEqual(rows);
    });
  });

  describe('aprovar', () => {
    it('deve aprovar solicitacao e preencher dados de analise', async () => {
      const row = { id: 'sol-1', status: solicitacaoStatus.APROVADA };
      mockReturning.mockResolvedValueOnce([row]);

      const result = await repository.aprovar({
        idSolicitacao: 'sol-1',
        analisadoPor: 'admin-1',
      });

      expect(mockUpdate).toHaveBeenCalledWith(solicitacaoCpfCrm);
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual(row);
    });

    it('deve retornar nulo ao aprovar solicitacao inexistente', async () => {
      mockReturning.mockResolvedValueOnce([]);

      const result = await repository.aprovar({
        idSolicitacao: 'sol-x',
        analisadoPor: 'admin-1',
      });

      expect(result).toBeNull();
    });
  });

  describe('rejeitar', () => {
    it('deve rejeitar solicitacao com motivo', async () => {
      const row = { id: 'sol-1', status: solicitacaoStatus.REJEITADA, motivoRejeicao: 'dados invalidos' };
      mockReturning.mockResolvedValueOnce([row]);

      const result = await repository.rejeitar({
        idSolicitacao: 'sol-1',
        analisadoPor: 'admin-1',
        motivoRejeicao: 'dados invalidos',
      });

      expect(mockUpdate).toHaveBeenCalledWith(solicitacaoCpfCrm);
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual(row);
    });

    it('deve retornar nulo ao rejeitar solicitacao inexistente', async () => {
      mockReturning.mockResolvedValueOnce([]);

      const result = await repository.rejeitar({
        idSolicitacao: 'sol-x',
        analisadoPor: 'admin-1',
        motivoRejeicao: 'dados invalidos',
      });

      expect(result).toBeNull();
    });
  });
});
