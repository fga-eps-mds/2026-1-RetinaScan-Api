import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './websocket-types';
import logger from '../logger';
import { authenticateSocket } from './authenticate-socket';

export function setupWebSocket(
  app: FastifyInstance,
): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  logger.info('Iniciando configuração do WebSocket');

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(app.server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void (async () => {
      try {
        logger.info('Autenticando socket', { socketId: socket.id });

        const usuario = await authenticateSocket(socket);

        socket.data.userId = usuario.userId;
        socket.data.email = usuario.email;
        socket.data.nome = usuario.nome;

        logger.info('Socket autenticado com sucesso', {
          socketId: socket.id,
          userId: usuario.userId,
        });

        next();
      } catch (error) {
        logger.warn('Falha na autenticação do socket', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : error,
        });

        next(new Error('Unauthorized'));
      }
    })();
  });

  app.decorate('io', io);

  io.on('connection', async (socket) => {
    const room = `user_${socket.data.userId}`;

    await socket.join(room);

    logger.info('Novo cliente conectado ao WebSocket', {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    socket.on('disconnect', () => {
      logger.info('Cliente desconectado do WebSocket', {
        socketId: socket.id,
        userId: socket.data.userId,
      });
    });
  });

  app.addHook('onClose', async () => {
    logger.info('Fechando conexão do WebSocket');

    await io.close(() => {
      logger.info('WebSocket fechado com sucesso');
    });
  });

  logger.info('Configuração do WebSocket concluída');

  return io;
}
