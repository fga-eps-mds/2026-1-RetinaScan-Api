import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { listLogsWithFilters } from '@/api/routes/log/list-logs-with-filters';

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

describe('listLogsWithFilters', () => {
  const execute = vi.fn();

  function makeReply() {
    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    return reply;
  }

  function makeRequest(query: Record<string, unknown>) {
    return {
      query,
    } as FastifyRequest;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(container.resolve).mockReturnValue({
      execute,
    } as never);
  });

  it('deve listar logs com filtros e paginação padrão', async () => {
    const logs = {
      data: [
        {
          id: 'log-1',
          action: 'LOGIN',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
      },
    };

    execute.mockResolvedValueOnce(logs);

    const request = makeRequest({});
    const reply = makeReply();

    await listLogsWithFilters(request, reply);

    expect(container.resolve).toHaveBeenCalledWith('listLogsWithFiltersUseCase');
    expect(execute).toHaveBeenCalledWith({
      filters: {
        action: undefined,
        actorUserId: undefined,
        startDate: undefined,
        endDate: undefined,
      },
      pagination: {
        page: 1,
        pageSize: 20,
      },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(logs);
  });

  it('deve listar logs com filtros informados', async () => {
    const logs = {
      data: [],
      meta: {
        page: 2,
        pageSize: 10,
        total: 0,
      },
    };

    execute.mockResolvedValueOnce(logs);

    const request = makeRequest({
      action: 'LOGIN',
      actorUserId: 'user-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      page: '2',
      pageSize: '10',
    });
    const reply = makeReply();

    await listLogsWithFilters(request, reply);

    expect(execute).toHaveBeenCalledWith({
      filters: {
        action: 'LOGIN',
        actorUserId: 'user-1',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
      },
      pagination: {
        page: 2,
        pageSize: 10,
      },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(logs);
  });

  it('deve lançar ValidationError quando startDate for maior que endDate', async () => {
    const request = makeRequest({
      startDate: '2026-06-01',
      endDate: '2026-05-01',
    });
    const reply = makeReply();

    await expect(listLogsWithFilters(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError quando page for inválido', async () => {
    const request = makeRequest({
      page: '0',
    });
    const reply = makeReply();

    await expect(listLogsWithFilters(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError quando pageSize for maior que 100', async () => {
    const request = makeRequest({
      pageSize: '101',
    });
    const reply = makeReply();

    await expect(listLogsWithFilters(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError quando houver parâmetro extra', async () => {
    const request = makeRequest({
      foo: 'bar',
    });
    const reply = makeReply();

    await expect(listLogsWithFilters(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
  });
});
