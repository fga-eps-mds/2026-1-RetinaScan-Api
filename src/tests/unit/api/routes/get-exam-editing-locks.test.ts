import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { getExamEditingLocks } from '@/api/routes/report/get-exams-report-locks';

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

function makeReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  } as unknown as FastifyReply & {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply;
}

describe('getExamEditingLocks', () => {
  const serviceMock = {
    getMany: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(serviceMock);
  });

  it('deve retornar os locks para a lista de examIds', async () => {
    const examId1 = '11111111-1111-1111-1111-111111111111';
    const examId2 = '22222222-2222-2222-2222-222222222222';

    const request = {
      query: {
        examIds: `${examId1}, ${examId2}`,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    serviceMock.getMany.mockResolvedValueOnce([{ userId: 'user-1', nome: 'Gustavo Costa' }, null]);

    await getExamEditingLocks(request, reply);

    expect(serviceMock.getMany).toHaveBeenCalledWith([examId1, examId2]);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      locks: {
        [examId1]: {
          isBeingEdited: true,
          editor: { userId: 'user-1', nome: 'Gustavo Costa' },
        },
        [examId2]: {
          isBeingEdited: false,
          editor: null,
        },
      },
    });
  });

  it('deve lançar ValidationError quando examIds for inválido', async () => {
    const request = {
      query: {
        examIds: 'abc',
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(getExamEditingLocks(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(serviceMock.getMany).not.toHaveBeenCalled();
  });
});
