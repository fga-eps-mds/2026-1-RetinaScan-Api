export type ServerToClientEvents = Record<string, never>;

export type NotificationPayload = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: Record<string, unknown> | null;
  lidaEm: Date | null;
  createdAt: Date;
};

// adicionar mais eventos conforme for necesario no futuro, por exemplo: 'notification:read', 'notification:deleted', etc
export type ClientToServerEvents = {
  'notification:new': (payload: NotificationPayload) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  userId: string;
  email?: string;
  nome?: string;
};
