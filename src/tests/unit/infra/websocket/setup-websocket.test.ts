import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { setupWebSocket } from '@/infra/websocket/setup-websocket';
import { authenticateSocket } from '@/infra/websocket/authenticate-socket';
import logger from '@/infra/logger';
import { Server as SocketIOServer } from 'socket.io';

vi.mock('@/infra/websocket/authenticate-socket', () => ({
  authenticateSocket: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const useMock = vi.fn();
const onMock = vi.fn();
const closeMock = vi.fn();
const socketIoConstructorMock = vi.fn();

vi.mock('socket.io', () => {
  const MockServer = vi.fn(
    class {
      constructor(...args: unknown[]) {
        socketIoConstructorMock(...args);
      }

      use = useMock;
      on = onMock;
      close = closeMock;
    },
  );

  return {
    Server: MockServer,
  };
});

describe('setupWebSocket', () => {
  const mockedAuthenticateSocket = vi.mocked(authenticateSocket);
  const mockedLogger = logger as unknown as {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  let decorateMock: ReturnType<typeof vi.fn>;
  let addHookMock: ReturnType<typeof vi.fn>;
  let app: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    decorateMock = vi.fn();
    addHookMock = vi.fn();

    app = {
      server: {},
      decorate: decorateMock,
      addHook: addHookMock,
    } as unknown as FastifyInstance;
  });

  it('deve criar o servidor socket.io com as opções esperadas e decorar o app', () => {
    const io = setupWebSocket(app);

    expect(SocketIOServer).toHaveBeenCalledTimes(1);
    expect(socketIoConstructorMock).toHaveBeenCalledWith(app.server, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    expect(decorateMock).toHaveBeenCalledTimes(1);
    expect(decorateMock).toHaveBeenCalledWith('io', io);

    expect(addHookMock).toHaveBeenCalledWith('onClose', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(useMock).toHaveBeenCalledWith(expect.any(Function));
    expect(mockedLogger.info).toHaveBeenCalledWith('Configuração do WebSocket concluída');
  });

  it('deve autenticar o socket no middleware e preencher socket.data', async () => {
    setupWebSocket(app);

    const middleware = useMock.mock.calls[0][0];
    const next = vi.fn();
    const socket = {
      id: 'socket-1',
      handshake: { headers: { cookie: 'session=abc' } },
      data: {},
    };

    mockedAuthenticateSocket.mockResolvedValueOnce({
      userId: 'user-1',
      email: 'gustavo@example.com',
      nome: 'Gustavo Costa',
    });

    middleware(socket, next);
    await new Promise(process.nextTick);

    expect(mockedAuthenticateSocket).toHaveBeenCalledWith(socket);
    expect(socket.data).toEqual({
      userId: 'user-1',
      email: 'gustavo@example.com',
      nome: 'Gustavo Costa',
    });
    expect(next).toHaveBeenCalledWith();
    expect(mockedLogger.info).toHaveBeenCalledWith('Socket autenticado com sucesso', {
      socketId: 'socket-1',
      userId: 'user-1',
    });
  });

  it('deve rejeitar o socket com Unauthorized quando autenticação falhar', async () => {
    setupWebSocket(app);

    const middleware = useMock.mock.calls[0][0];
    const next = vi.fn();
    const socket = {
      id: 'socket-1',
      handshake: { headers: {} },
      data: {},
    };

    mockedAuthenticateSocket.mockRejectedValueOnce(new Error('invalid session'));

    middleware(socket, next);
    await new Promise(process.nextTick);

    expect(mockedAuthenticateSocket).toHaveBeenCalledWith(socket);
    expect(next).toHaveBeenCalledTimes(1);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unauthorized');

    expect(mockedLogger.warn).toHaveBeenCalledWith('Falha na autenticação do socket', {
      socketId: 'socket-1',
      error: 'invalid session',
    });
  });

  it('deve entrar na room do usuário ao conectar e registrar handler de disconnect', async () => {
    setupWebSocket(app);

    const connectionHandler = onMock.mock.calls.find(([event]) => event === 'connection')?.[1];
    const joinMock = vi.fn().mockResolvedValue(undefined);
    const disconnectHandlerRegistry: Record<string, () => void> = {};

    const socket = {
      id: 'socket-1',
      data: {
        userId: 'user-1',
      },
      join: joinMock,
      on: vi.fn((event: string, handler: () => void) => {
        disconnectHandlerRegistry[event] = handler;
      }),
    };

    await connectionHandler(socket);

    expect(joinMock).toHaveBeenCalledWith('user_user-1');
    expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockedLogger.info).toHaveBeenCalledWith('Novo cliente conectado ao WebSocket', {
      socketId: 'socket-1',
      userId: 'user-1',
    });

    disconnectHandlerRegistry.disconnect();

    expect(mockedLogger.info).toHaveBeenCalledWith('Cliente desconectado do WebSocket', {
      socketId: 'socket-1',
      userId: 'user-1',
    });
  });

  it('deve fechar o socket server no onClose hook', async () => {
    setupWebSocket(app);

    const onCloseHandler = addHookMock.mock.calls.find(([hook]) => hook === 'onClose')?.[1];

    closeMock.mockImplementationOnce((callback?: () => void) => {
      callback?.();
      return Promise.resolve();
    });

    await onCloseHandler();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Fechando conexão do WebSocket');
    expect(mockedLogger.info).toHaveBeenCalledWith('WebSocket fechado com sucesso');
  });
});
