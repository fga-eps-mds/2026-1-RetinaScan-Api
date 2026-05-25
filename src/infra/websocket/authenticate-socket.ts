import type { Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './websocket-types';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/lib/auth';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export async function authenticateSocket(socket: AppSocket) {
  const headers = fromNodeHeaders(socket.handshake.headers);

  const session = await auth.api.getSession({
    headers,
  });

  if (!session?.user.id) {
    throw new Error('Unauthorized');
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    nome: session.user.name,
  };
}
