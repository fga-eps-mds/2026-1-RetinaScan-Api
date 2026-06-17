import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { deletarSolicitacaoCpfCrmAdminRoute } from '@/api/routes/users/deletar-solicitacao-cpf-crm';

const mockExecute = vi.fn();

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(() => ({
      execute: mockExecute,
    })),
  },
}));

describe('deletarSolicitacaoCpfCrmAdminRoute', () => {
  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    request = {
      params: {
        idSolicitacao: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
      },
    };

    reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  it('deve deletar solicitacao e retornar 204', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await deletarSolicitacaoCpfCrmAdminRoute(request as FastifyRequest, reply as FastifyReply);

    expect(container.resolve).toHaveBeenCalledWith('deletarSolicitacaoCpfCrmUsecase');
    expect(mockExecute).toHaveBeenCalledWith({
      idSolicitacao: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
    });
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(reply.send).toHaveBeenCalled();
  });

  it('deve lançar ValidationError quando idSolicitacao for inválido', async () => {
    request.params = {
      idSolicitacao: 'id-invalido',
    };

    await expect(
      deletarSolicitacaoCpfCrmAdminRoute(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(mockExecute).not.toHaveBeenCalled();
  });
});
