import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';
import { RedisReportEditingPresenceService } from '@/infra/shared/redis-report-editing-presence-service';

describe('RedisReportEditingPresenceService', () => {
  let redisMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
    srem: ReturnType<typeof vi.fn>;
    sadd: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };

  let service: RedisReportEditingPresenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T03:00:00.000Z'));

    redisMock = {
      get: vi.fn(),
      set: vi.fn(),
      eval: vi.fn(),
      srem: vi.fn(),
      sadd: vi.fn(),
      expire: vi.fn(),
    };

    service = new RedisReportEditingPresenceService(redisMock as unknown as Redis);
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
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      startedAt: '2026-06-07T02:59:00.000Z',
      expiresAt: '2026-06-07T03:05:00.000Z',
    };

    redisMock.get.mockResolvedValueOnce(JSON.stringify(presence));

    const result = await service.get('exam-1');

    expect(result).toEqual(presence);
  });

  it('deve adquirir lock quando não houver presença existente', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.eval.mockResolvedValueOnce([
      1,
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        socketId: 'socket-1',
        pageSessionId: 'page-1',
        startedAt: '2026-06-07T03:00:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      ttlSeconds: 120,
    });

    expect(redisMock.eval).toHaveBeenCalledTimes(1);

    const evalArgs = redisMock.eval.mock.calls[0];
    expect(evalArgs[1]).toBe(2);
    expect(evalArgs[2]).toBe('exam:exam-1:specialist-report:editing');
    expect(evalArgs[3]).toBe('socket:socket-1:report-editing:exams');
    expect(evalArgs[4]).toBe('user-1');
    expect(evalArgs[6]).toBe('120');
    expect(evalArgs[7]).toBe('socket-1');
    expect(evalArgs[8]).toBe('180');

    const sentPresence = JSON.parse(evalArgs[5]);
    expect(sentPresence).toEqual({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      startedAt: '2026-06-07T03:00:00.000Z',
      expiresAt: '2026-06-07T03:02:00.000Z',
    });

    expect(result).toEqual({
      acquired: true,
      presence: {
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        socketId: 'socket-1',
        pageSessionId: 'page-1',
        startedAt: '2026-06-07T03:00:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      },
    });

    expect(redisMock.srem).not.toHaveBeenCalled();
  });

  it('deve preservar startedAt ao renovar acquire para o mesmo usuário', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-1',
        nome: 'Gustavo',
        socketId: 'socket-1',
        pageSessionId: 'page-old',
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
        socketId: 'socket-2',
        pageSessionId: 'page-new',
        startedAt: '2026-06-07T02:50:00.000Z',
        expiresAt: '2026-06-07T03:02:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-2',
      pageSessionId: 'page-new',
      ttlSeconds: 120,
    });

    const evalArgs = redisMock.eval.mock.calls[0];
    const sentPresence = JSON.parse(evalArgs[5]);

    expect(sentPresence.startedAt).toBe('2026-06-07T02:50:00.000Z');
    expect(sentPresence.socketId).toBe('socket-2');
    expect(sentPresence.pageSessionId).toBe('page-new');

    expect(redisMock.srem).toHaveBeenCalledWith('socket:socket-1:report-editing:exams', 'exam-1');

    expect(result.acquired).toBe(true);
    expect(result.presence.startedAt).toBe('2026-06-07T02:50:00.000Z');
  });

  it('não deve limpar socket antigo quando acquire for negado', async () => {
    redisMock.get.mockResolvedValueOnce(
      JSON.stringify({
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        socketId: 'socket-9',
        pageSessionId: 'page-9',
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
        socketId: 'socket-9',
        pageSessionId: 'page-9',
        startedAt: '2026-06-07T02:55:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      }),
    ]);

    const result = await service.acquire({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      ttlSeconds: 120,
    });

    expect(result).toEqual({
      acquired: false,
      presence: {
        examId: 'exam-1',
        userId: 'user-2',
        nome: 'Outro usuário',
        socketId: 'socket-9',
        pageSessionId: 'page-9',
        startedAt: '2026-06-07T02:55:00.000Z',
        expiresAt: '2026-06-07T03:05:00.000Z',
      },
    });

    expect(redisMock.srem).not.toHaveBeenCalled();
  });

  it('deve retornar null no heartbeat quando não existir lock', async () => {
    redisMock.get.mockResolvedValueOnce(null);

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      ttlSeconds: 120,
    });

    expect(result).toBeNull();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('deve retornar a presença atual no heartbeat quando outro usuário for o editor', async () => {
    const existing = {
      examId: 'exam-1',
      userId: 'user-2',
      nome: 'Outro usuário',
      socketId: 'socket-9',
      pageSessionId: 'page-9',
      startedAt: '2026-06-07T02:50:00.000Z',
      expiresAt: '2026-06-07T03:05:00.000Z',
    };

    redisMock.get.mockResolvedValueOnce(JSON.stringify(existing));

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      ttlSeconds: 120,
    });

    expect(result).toEqual(existing);
    expect(redisMock.set).not.toHaveBeenCalled();
    expect(redisMock.srem).not.toHaveBeenCalled();
    expect(redisMock.sadd).not.toHaveBeenCalled();
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('deve renovar heartbeat, preservar startedAt e atualizar socket sets quando socket mudar', async () => {
    const existing = {
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-old',
      pageSessionId: 'page-old',
      startedAt: '2026-06-07T02:40:00.000Z',
      expiresAt: '2026-06-07T02:59:00.000Z',
    };

    redisMock.get.mockResolvedValueOnce(JSON.stringify(existing));
    redisMock.set.mockResolvedValueOnce('OK');
    redisMock.srem.mockResolvedValueOnce(1);
    redisMock.sadd.mockResolvedValueOnce(1);
    redisMock.expire.mockResolvedValueOnce(1);

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      socketId: 'socket-new',
      pageSessionId: 'page-new',
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
      socketId: 'socket-new',
      pageSessionId: 'page-new',
      startedAt: '2026-06-07T02:40:00.000Z',
      expiresAt: '2026-06-07T03:02:00.000Z',
    });

    expect(redisMock.srem).toHaveBeenCalledWith('socket:socket-old:report-editing:exams', 'exam-1');
    expect(redisMock.sadd).toHaveBeenCalledWith('socket:socket-new:report-editing:exams', 'exam-1');
    expect(redisMock.expire).toHaveBeenCalledWith('socket:socket-new:report-editing:exams', 180);

    expect(result).toEqual({
      examId: 'exam-1',
      userId: 'user-1',
      nome: 'Gustavo',
      socketId: 'socket-new',
      pageSessionId: 'page-new',
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
        socketId: 'socket-1',
        pageSessionId: 'page-1',
        startedAt: '2026-06-07T02:40:00.000Z',
        expiresAt: '2026-06-07T02:59:00.000Z',
      }),
    );

    redisMock.set.mockResolvedValueOnce(null);

    const result = await service.heartbeat({
      examId: 'exam-1',
      userId: 'user-1',
      socketId: 'socket-1',
      pageSessionId: 'page-2',
      ttlSeconds: 120,
    });

    expect(result).toBeNull();
    expect(redisMock.srem).not.toHaveBeenCalled();
    expect(redisMock.sadd).not.toHaveBeenCalled();
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('deve chamar eval corretamente no release', async () => {
    redisMock.eval.mockResolvedValueOnce(1);

    await service.release({
      examId: 'exam-1',
      userId: 'user-1',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
    });

    expect(redisMock.eval).toHaveBeenCalledTimes(1);

    const args = redisMock.eval.mock.calls[0];
    expect(args[1]).toBe(2);
    expect(args[2]).toBe('exam:exam-1:specialist-report:editing');
    expect(args[3]).toBe('socket:socket-1:report-editing:exams');
    expect(args[4]).toBe('user-1');
    expect(args[5]).toBe('socket-1');
    expect(args[6]).toBe('exam-1');
  });

  it('deve retornar os examIds liberados no releaseAllBySocket', async () => {
    redisMock.eval.mockResolvedValueOnce(['exam-1', 'exam-2']);

    const result = await service.releaseAllBySocket('socket-1');

    expect(redisMock.eval).toHaveBeenCalledTimes(1);

    const args = redisMock.eval.mock.calls[0];
    expect(args[1]).toBe(1);
    expect(args[2]).toBe('socket:socket-1:report-editing:exams');
    expect(args[3]).toBe('socket-1');

    expect(result).toEqual(['exam-1', 'exam-2']);
  });
});
