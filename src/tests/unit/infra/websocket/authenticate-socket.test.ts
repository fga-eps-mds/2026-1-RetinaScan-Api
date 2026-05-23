import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io';

import { authenticateSocket } from '@/infra/websocket/authenticate-socket';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/lib/auth';

vi.mock('better-auth/node', () => ({
  fromNodeHeaders: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

type AppSocket = Socket;

describe('authenticateSocket', () => {
  const mockedFromNodeHeaders = vi.mocked(fromNodeHeaders);
  const mockedGetSession = vi.mocked(auth.api.getSession);

  const makeSocket = (headers: Record<string, string> = {}) =>
    ({
      handshake: {
        headers,
      },
    }) as AppSocket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve autenticar o socket e retornar os dados do usuário', async () => {
    const socket = makeSocket({
      cookie: 'session=abc123',
      authorization: 'Bearer token',
    });

    const normalizedHeaders = new Headers({
      cookie: 'session=abc123',
      authorization: 'Bearer token',
    });

    mockedFromNodeHeaders.mockReturnValue(normalizedHeaders);
    mockedGetSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'gustavo@example.com',
        name: 'Gustavo Costa',
      },
      session: {
        id: 'session-1',
        userId: 'user-1',
      },
    } as never);

    const result = await authenticateSocket(socket);

    expect(mockedFromNodeHeaders).toHaveBeenCalledTimes(1);
    expect(mockedFromNodeHeaders).toHaveBeenCalledWith(socket.handshake.headers);

    expect(mockedGetSession).toHaveBeenCalledTimes(1);
    expect(mockedGetSession).toHaveBeenCalledWith({
      headers: normalizedHeaders,
    });

    expect(result).toEqual({
      userId: 'user-1',
      email: 'gustavo@example.com',
      nome: 'Gustavo Costa',
    });
  });

  it('deve lançar Unauthorized quando não existir sessão', async () => {
    const socket = makeSocket({
      cookie: 'session=abc123',
    });

    mockedFromNodeHeaders.mockReturnValue(new Headers());
    mockedGetSession.mockResolvedValue(null as never);

    await expect(authenticateSocket(socket)).rejects.toThrow('Unauthorized');

    expect(mockedFromNodeHeaders).toHaveBeenCalledWith(socket.handshake.headers);
    expect(mockedGetSession).toHaveBeenCalledTimes(1);
  });

  it('deve lançar Unauthorized quando a sessão não tiver user.id', async () => {
    const socket = makeSocket({
      cookie: 'session=abc123',
    });

    mockedFromNodeHeaders.mockReturnValue(new Headers());
    mockedGetSession.mockResolvedValue({
      user: {
        id: '',
        email: 'gustavo@example.com',
        name: 'Gustavo Costa',
      },
      session: {
        id: 'session-1',
      },
    } as never);

    await expect(authenticateSocket(socket)).rejects.toThrow('Unauthorized');

    expect(mockedFromNodeHeaders).toHaveBeenCalledWith(socket.handshake.headers);
    expect(mockedGetSession).toHaveBeenCalledTimes(1);
  });
});
