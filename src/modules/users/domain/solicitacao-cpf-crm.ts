export const solicitacaoStatus = {
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
} as const;

export type SolicitacaoStatus = keyof typeof solicitacaoStatus;

export type SolicitacaoCpfCrm = {
  id: string;
  idUsuario: string;
  cpfNovo: string;
  crmNovo: string;
  status: SolicitacaoStatus;
  motivoRejeicao: string | null;
  analisadoPor: string | null;
  analisadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
