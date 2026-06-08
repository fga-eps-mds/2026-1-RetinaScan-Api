import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';
import { RedisReportEditingPresenceService } from '@/infra/shared/redis-report-editing-presence-service';

describe('RedisReportEditingPresenceService', () => {
  let redisMock: {
    get: ReturnType<typeof vi.fn>;
    mget: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
  };

  let service: RedisReportEditingPresenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T03:00:00.000Z'));

    redisMock = {
      get: vi.fn(),
      mget: vi.fn(),
      set: vi.fn(),
      eval: vi.fn(),
    };

    service = new RedisReportEditingPresenceService(redisMock as unknown as Redis);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve retornar null no get quando não existir lock', async () => {
    redisMock.get.mockResolvedValueOnce(null);

    const result = await service.get('exam-1');

    expect(redisMock.get).toHaveBeenCalledWith('exam:exam-1:specialist-report:editing');
    expect(result).toBeNull();
  });

  it('deve retornar a presença no get quando existir lock', async () => {
    const presence = {
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      startedAt: '2026-06-07T02:59:00.000Z',
      expiresAt: '2026-06-07T03:05:00.000Z',
    };

    redisMock.get.mockResolvedValueOnce(JSON.stringify(presence));

    const result = await service.get('exam-1');

    expect(result).toEqual(presence);
  });

  it('deve retornar lista vazia no getMany quando não houver examIds', async () => {
    const result = await service.getMany([]);

    expect(result).toEqual([]);
    expect(redisMock.mget).not.toHaveBeenCalled();
  });

  it('deve buscar múltiplos locks com mget no getMany', async () => {
    redisMock.mget.mockResolvedValueOnce([
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-1',
        startedAt: '2026-06-07T02:59:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      }),
      null,
    ]);

    const result = await service.getMany(['exam-1', 'exam-2']);

    expect(redisMock.mget).toHaveBeenCalledWith(
      'exam:exam-1:specialist-report:editing',
      'exam:exam-2:specialist-report:editing',
    );

    expect(result).toEqual([
      {
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-1',
        startedAt: '2026-06-07T02:59:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      },
      null,
    ]);
  });

  it('deve adquirir lock quando não houver presença existente', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.eval.mockResolvedValueOnce([
      1,
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-1',
        startedAt: '2026-06-07T03:00:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(redisMock.eval).toHaveBeenCalledTimes(1);

    const evalArgs = redisMock.eval.mock.calls[0];
    expect(evalArgs[1]).toBe(1);
    expect(evalArgs[2]).toBe('exam:exam-1:specialist-report:editing');
    expect(evalArgs[3]).toBe('user-1');
    expect(evalArgs[5]).toBe('120');

    const sentPresence = JSON.parse(evalArgs[4]);
    expect(sentPresence).toEqual({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      startedAt: '2026-06-07T03:00:00.000Z',
      expiresAt: '2026-06-07T03:02:00.000Z',
    });

    expect(result).toEqual({
      acquired: true,
      presence: {
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-1',
        startedAt: '2026-06-07T03:00:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      },
    });
  });

  it('deve preservar startedAt ao renovar acquire para o mesmo usuário', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-old',
        startedAt: '2026-06-07T02:50:00.000Z',
        expiresAt: '2026-06-07T03:01:00.000Z',
      }),
    );

    redisMock.eval.mockResolvedValueOnce([
      1,
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-new',
        startedAt: '2026-06-07T02:50:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-new',
      ttlSeconds: 120,
    });

    const evalArgs = redisMock.eval.mock.calls[0];
    const sentPresence = JSON.parse(evalArgs[4]);

    expect(sentPresence.startedAt).toBe('2026-06-07T02:50:00.000Z');
    expect(sentPresence.sessionId).toBe('session-new');

    expect(result.acquired).toBe(true);
    expect(result.presence.startedAt).toBe('2026-06-07T02:50:00.000Z');
  });

  it('deve negar acquire quando o lock pertencer a outro usuário', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        sessionId: 'session-9',
        startedAt: '2026-06-07T02:55:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      }),
    );

    redisMock.eval.mockResolvedValueOnce([
      0,
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        sessionId: 'session-9',
        startedAt: '2026-06-07T02:55:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(result).toEqual({
      acquired: false,
      presence: {
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        sessionId: 'session-9',
        startedAt: '2026-06-07T02:55:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      },
    });
  });

  it('deve retornar null no heartbeat quando não existir lock', async () => {
    redisMock.get.mockResolvedValueOnce(null);

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(result).toBeNull();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('deve retornar null no heartbeat quando outro usuário for o editor', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        sessionId: 'session-9',
        startedAt: '2026-06-07T02:50:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      }),
    );

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(result).toBeNull();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('deve renovar heartbeat e preservar startedAt e sessionId atuais', async () => {
    const existing = {
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      startedAt: '2026-06-07T02:40:00.000Z',
      expiresAt: '2026-06-07T02:59:00.000Z',
    };

    redisMock.get.mockResolvedValueOnce(JSON.stringify(existing));
    redisMock.set.mockResolvedValueOnce('OK');

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(redisMock.set).toHaveBeenCalledTimes(1);

    const [key, value, ex, ttl, xx] = redisMock.set.mock.calls[0];
    expect(key).toBe('exam:exam-1:specialist-report:editing');
    expect(ex).toBe('EX');
    expect(ttl).toBe(120);
    expect(xx).toBe('XX');

    const renewed = JSON.parse(value);
    expect(renewed).toEqual({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      startedAt: '2026-06-07T02:40:00.000Z',
      expiresAt: '2026-06-07T03:02:00.000Z',
    });

    expect(result).toEqual({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      sessionId: 'session-1',
      startedAt: '2026-06-07T02:40:00.000Z',
      expiresAt: '2026-06-07T03:02:00.000Z',
    });
  });

  it('deve retornar null no heartbeat se a chave expirar entre get e set', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        sessionId: 'session-1',
        startedAt: '2026-06-07T02:40:00.000Z',
        expiresAt: '2026-06-07T02:59:00.000Z',
      }),
    );

    redisMock.set.mockResolvedValueOnce(null);

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      sessionId: 'session-1',
      ttlSeconds: 120,
    });

    expect(result).toBeNull();
  });

  it('deve chamar eval corretamente no release', async () => {
    redisMock.eval.mockResolvedValueOnce(1);

    await service.release({
      examId: 'exam-1',
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(redisMock.eval).toHaveBeenCalledTimes(1);

    const args = redisMock.eval.mock.calls[0];
    expect(args[1]).toBe(1);
    expect(args[2]).toBe('exam:exam-1:specialist-report:editing');
    expect(args[3]).toBe('user-1');
    expect(args[4]).toBe('session-1');
  });
});
