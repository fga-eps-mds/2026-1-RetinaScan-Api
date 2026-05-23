import type { CriarNotificacaoDTO, Notificacao, TipoNotificacao } from '../domain';

export type ListarNotificacoesPorUsuarioParams = {
  usuarioId: string;
  limit?: number;
  status?: 'todas' | 'nao-lidas' | 'lidas';
  tipo?: TipoNotificacao;
};

export interface NotificationsRepository {
  criar(input: CriarNotificacaoDTO): Promise<Notificacao>;
  buscarPorChave(chaveDedupe: string): Promise<Notificacao | null>;
  listarPorUsuario(params: ListarNotificacoesPorUsuarioParams): Promise<Notificacao[]>;
  marcarComoLida(params: { notificacaoId: string; usuarioId: string }): Promise<boolean>;
  marcarTodasComoLidas(usuarioId: string): Promise<void>;
  marcarEnviadaEmTempoReal(notificacaoId: string): Promise<void>;
  marcarEnviadaPorEmail(notificacaoId: string): Promise<void>;
  deletar(notificacaoId: string, usuarioId: string): Promise<boolean>;
}
