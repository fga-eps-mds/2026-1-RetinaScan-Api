import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { heartbeatReportLock } from '@/api/routes/report/heart-beart-report-lock';
import { releaseReportLock } from '@/api/routes/report/release-report-lock';

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

describe('heartbeatReportLock', () => {
  const serviceMock = {
    heartbeat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(serviceMock);
  });

  it('deve renovar o lock e retornar expiresAt', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: { id: 'user-1' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    serviceMock.heartbeat.mockResolvedValueOnce({
      expiresAt: '2026-06-07T12:00:00.000Z',
    });

    await heartbeatReportLock(request, reply);

    expect(serviceMock.heartbeat).toHaveBeenCalledWith({
      examId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      sessionId: '22222222-2222-2222-2222-222222222222',
      ttlSeconds: 120,
    });

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      expiresAt: '2026-06-07T12:00:00.000Z',
    });
  });

  it('deve retornar 404 quando o lock não existir ou não pertencer ao usuário', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: { id: 'user-1' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    serviceMock.heartbeat.mockResolvedValueOnce(null);

    await heartbeatReportLock(request, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Lock não encontrado ou não pertence ao usuário.',
    });
  });

  it('deve lançar ValidationError com examId inválido', async () => {
    const request = {
      params: { examId: 'abc' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: { id: 'user-1' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(heartbeatReportLock(request, reply)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('releaseReportLock', () => {
  const serviceMock = {
    release: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(serviceMock);
  });

  it('deve liberar o lock e retornar 204', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: '22222222-2222-2222-2222-222222222222' },
      user: { id: 'user-1' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await releaseReportLock(request, reply);

    expect(serviceMock.release).toHaveBeenCalledWith({
      examId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      sessionId: '22222222-2222-2222-2222-222222222222',
    });

    expect(reply.status).toHaveBeenCalledWith(204);
    expect(reply.send).toHaveBeenCalledWith();
  });

  it('deve lançar ValidationError com sessionId inválido', async () => {
    const request = {
      params: { examId: '11111111-1111-1111-1111-111111111111' },
      body: { sessionId: 'abc' },
      user: { id: 'user-1' },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(releaseReportLock(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(serviceMock.release).not.toHaveBeenCalled();
  });
});
