import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { acquireReportLock } from '@/api/routes/report/acquire-report-lock';

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

vi.mock('@/env', () => ({
  env: {
    SPECIALIST_REPORT_EDITING_TTL_SECONDS: 120,
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

describe('acquireReportLock', () => {
  const serviceMock = {
    acquire: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(serviceMock);
  });

  it('deve adquirir lock com sucesso', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: {
        id: 'user-1',
        nomeCompleto: 'Gustavo Costa',
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    serviceMock.acquire.mockResolvedValueOnce({
      acquired: true,
      presence: {
        userId: 'user-1',
        nome: 'Gustavo Costa',
      },
    });

    await acquireReportLock(request, reply);

    expect(serviceMock.acquire).toHaveBeenCalledWith({
      examId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      nome: 'Gustavo Costa',
      sessionId: '22222222-2222-2222-2222-222222222222',
      ttlSeconds: 120,
    });

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      acquired: true,
      editor: {
        userId: 'user-1',
        nome: 'Gustavo Costa',
      },
    });
  });

  it('deve responder acquired false quando lock já pertencer a outro editor', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: {
        id: 'user-1',
        nomeCompleto: 'Gustavo Costa',
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    serviceMock.acquire.mockResolvedValueOnce({
      acquired: false,
      presence: {
        userId: 'user-2',
        nome: 'Outro Especialista',
      },
    });

    await acquireReportLock(request, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      acquired: false,
      editor: {
        userId: 'user-2',
        nome: 'Outro Especialista',
      },
    });
  });

  it('deve lançar ValidationError para examId inválido', async () => {
    const request = {
      params: { examId: 'abc' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: { id: 'user-1', nomeCompleto: 'Gustavo Costa' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(acquireReportLock(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(serviceMock.acquire).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError para sessionId inválido', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: 'abc' },
      user: { id: 'user-1', nomeCompleto: 'Gustavo Costa' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(acquireReportLock(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(serviceMock.acquire).not.toHaveBeenCalled();
  });
});
