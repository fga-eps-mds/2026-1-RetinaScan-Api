import { ListLogsWithFiltersUseCase } from '@/modules/audit-log/use-case/list-logs-with-filters';
import { describe, expect, it, vi } from 'vitest';

describe('ListLogsWithFiltersUseCase', () => {
  it('deve chamar auditLogsRepository.findMany com os filtros e paginação informados', async () => {
    const findMany = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'log-1',
          action: 'LOGIN',
          category: 'AUTH',
          description: 'Usuário autenticado',
          actorUserId: 'user-1',
          actorName: 'Gustavo Costa',
          actorEmail: 'gustavo@email.com',
          targetEntityType: null,
          targetEntityId: null,
          targetDisplay: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
          requestId: 'req-1',
          changes: null,
          metadata: null,
          createdAt: new Date('2026-05-31T20:00:00.000Z'),
        },
      ],
      total: 1,
    });

    const auditLogsRepository = {
      findMany,
    };

    const sut = new ListLogsWithFiltersUseCase(auditLogsRepository as any);

    const input = {
      filters: {
        action: 'LOGIN',
        actorUserId: 'user-1',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T23:59:59.999Z'),
      },
      pagination: {
        page: 2,
        pageSize: 10,
      },
    };

    const result = await sut.execute(input);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(input);
    expect(result).toEqual({
      data: [
        {
          id: 'log-1',
          action: 'LOGIN',
          category: 'AUTH',
          description: 'Usuário autenticado',
          actorUserId: 'user-1',
          actorName: 'Gustavo Costa',
          actorEmail: 'gustavo@email.com',
          targetEntityType: null,
          targetEntityId: null,
          targetDisplay: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
          requestId: 'req-1',
          changes: null,
          metadata: null,
          createdAt: new Date('2026-05-31T20:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('deve retornar lista vazia quando o repository não encontrar logs', async () => {
    const findMany = vi.fn().mockResolvedValue({
      data: [],
      total: 0,
    });

    const auditLogsRepository = {
      findMany,
    };

    const sut = new ListLogsWithFiltersUseCase(auditLogsRepository as any);

    const input = {
      filters: {},
      pagination: {
        page: 1,
        pageSize: 20,
      },
    };

    const result = await sut.execute(input);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(input);
    expect(result).toEqual({
      data: [],
      total: 0,
    });
  });
});
