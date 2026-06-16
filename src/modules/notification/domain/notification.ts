export const TIPOS_NOTIFICACAO = [
  'avaliacao_ia_atualizada',
  'avaliacao_ia_error',
  'avaliacao_ia_revisada_por_especialista',
  'status_solicitacao_cadastral_atualizado',
  'laudo_especialista_criado',
  'laudo_especialista_atualizado',
];

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number];

export type DadosNotificacao = Record<string, unknown>;

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  dados: DadosNotificacao | null;
  chaveDedupe: string;
  lidaEm: Date | null;
  enviadaEmTempoRealEm: Date | null;
  enviadaPorEmailEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CriarNotificacaoDTO {
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  dados?: DadosNotificacao | null;
  chaveDedupe: string;
}
