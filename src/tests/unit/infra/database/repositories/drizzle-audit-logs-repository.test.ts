import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';
import { db } from '@/infra/database/drizzle/connection';

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

describe('DrizzleAuditLogsRepository', () => {
  let repository: DrizzleAuditLogsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DrizzleAuditLogsRepository();
  });

  it('deve criar um log de auditoria', async () => {
    const row = {
      idLog: 'log-1',
      action: 'LOGIN',
      category: 'AUTH',
      description: 'Login realizado com sucesso',
      actorUserId: 'user-1',
      actorName: 'Gustavo Costa',
      actorEmail: 'gustavo@email.com',
      targetEntityType: 'user',
      targetEntityId: 'user-1',
      targetDisplay: 'gustavo@email.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      requestId: 'req-1',
      changes: null,
      metadata: { email: 'gustavo@email.com' },
      createdAt: new Date('2026-05-31T20:00:00.000Z'),
    };

    const returning = vi.fn().mockResolvedValue([row]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });

    vi.mocked(db.insert).mockImplementation(insert as never);

    const result = await repository.create({
      action: 'LOGIN',
      category: 'AUTH',
      description: 'Login realizado com sucesso',
      actorUserId: 'user-1',
      actorName: 'Gustavo Costa',
      actorEmail: 'gustavo@email.com',
      targetEntityType: 'user',
      targetEntityId: 'user-1',
      targetDisplay: 'gustavo@email.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      requestId: 'req-1',
      changes: null,
      metadata: { email: 'gustavo@email.com' },
    });

    expect(db.insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith({
      action: 'LOGIN',
      category: 'AUTH',
      description: 'Login realizado com sucesso',
      actorUserId: 'user-1',
      actorName: 'Gustavo Costa',
      actorEmail: 'gustavo@email.com',
      targetEntityType: 'user',
      targetEntityId: 'user-1',
      targetDisplay: 'gustavo@email.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      requestId: 'req-1',
      changes: null,
      metadata: { email: 'gustavo@email.com' },
    });

    expect(result).toEqual({
      id: 'log-1',
      action: 'LOGIN',
      category: 'AUTH',
      description: 'Login realizado com sucesso',
      actorUserId: 'user-1',
      actorName: 'Gustavo Costa',
      actorEmail: 'gustavo@email.com',
      targetEntityType: 'user',
      targetEntityId: 'user-1',
      targetDisplay: 'gustavo@email.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      requestId: 'req-1',
      changes: null,
      metadata: { email: 'gustavo@email.com' },
      createdAt: new Date('2026-05-31T20:00:00.000Z'),
    });
  });

  it('deve listar logs com filtros e paginação', async () => {
    const rows = [
      {
        idLog: 'log-2',
        action: 'UPDATE',
        category: 'USER_MANAGEMENT',
        description: 'Usuário atualizou perfil',
        actorUserId: 'user-1',
        actorName: 'Gustavo Costa',
        actorEmail: 'gustavo@email.com',
        targetEntityType: 'user',
        targetEntityId: 'user-1',
        targetDisplay: 'gustavo@email.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
        requestId: 'req-2',
        changes: { email: 'novo@email.com' },
        metadata: null,
        createdAt: new Date('2026-05-31T21:00:00.000Z'),
      },
    ];

    const rowsOffset = vi.fn().mockResolvedValue(rows);
    const rowsLimit = vi.fn().mockReturnValue({ offset: rowsOffset });
    const rowsOrderBy = vi.fn().mockReturnValue({ limit: rowsLimit });
    const rowsWhere = vi.fn().mockReturnValue({ orderBy: rowsOrderBy });
    const rowsFrom = vi.fn().mockReturnValue({ where: rowsWhere });

    const totalWhere = vi.fn().mockResolvedValue([{ value: 1 }]);
    const totalFrom = vi.fn().mockReturnValue({ where: totalWhere });

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: rowsFrom })
      .mockReturnValueOnce({ from: totalFrom });

    vi.mocked(db.select).mockImplementation(select as never);

    const result = await repository.findMany({
      filters: {
        action: 'UPDATE',
        actorUserId: 'user-1',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T23:59:59.999Z'),
      },
      pagination: {
        page: 2,
        pageSize: 10,
      },
    });

    expect(db.select).toHaveBeenCalledTimes(2);
    expect(rowsFrom).toHaveBeenCalled();
    expect(rowsWhere).toHaveBeenCalled();
    expect(rowsOrderBy).toHaveBeenCalled();
    expect(rowsLimit).toHaveBeenCalledWith(10);
    expect(rowsOffset).toHaveBeenCalledWith(10);
    expect(totalFrom).toHaveBeenCalled();
    expect(totalWhere).toHaveBeenCalled();

    expect(result).toEqual({
      data: [
        {
          id: 'log-2',
          action: 'UPDATE',
          category: 'USER_MANAGEMENT',
          description: 'Usuário atualizou perfil',
          actorUserId: 'user-1',
          actorName: 'Gustavo Costa',
          actorEmail: 'gustavo@email.com',
          targetEntityType: 'user',
          targetEntityId: 'user-1',
          targetDisplay: 'gustavo@email.com',
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
          requestId: 'req-2',
          changes: { email: 'novo@email.com' },
          metadata: null,
          createdAt: new Date('2026-05-31T21:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('deve listar logs sem filtros', async () => {
    const rowsOffset = vi.fn().mockResolvedValue([]);
    const rowsLimit = vi.fn().mockReturnValue({ offset: rowsOffset });
    const rowsOrderBy = vi.fn().mockReturnValue({ limit: rowsLimit });
    const rowsWhere = vi.fn().mockReturnValue({ orderBy: rowsOrderBy });
    const rowsFrom = vi.fn().mockReturnValue({ where: rowsWhere });

    const totalWhere = vi.fn().mockResolvedValue([{ value: 0 }]);
    const totalFrom = vi.fn().mockReturnValue({ where: totalWhere });

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: rowsFrom })
      .mockReturnValueOnce({ from: totalFrom });

    vi.mocked(db.select).mockImplementation(select as never);

    const result = await repository.findMany({
      filters: {},
      pagination: {
        page: 1,
        pageSize: 20,
      },
    });

    expect(rowsLimit).toHaveBeenCalledWith(20);
    expect(rowsOffset).toHaveBeenCalledWith(0);
    expect(result).toEqual({
      data: [],
      total: 0,
    });
  });
});
