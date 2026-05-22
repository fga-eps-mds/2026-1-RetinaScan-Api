export type ServerToClientEvents = Record<string, never>;

export type ClientToServerEvents = Record<string, never>;

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  userId: string;
  email?: string;
  nome?: string;
};
