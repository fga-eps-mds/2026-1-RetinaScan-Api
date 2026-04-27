import type { Usuario } from './usuario';

export const solicitacaoStatus = {
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
} as const;

export type SolicitacaoStatus = keyof typeof solicitacaoStatus;

export type SolicitacaoCpfCrm = {
  id: string;
  idUsuario: string;
  cpfNovo: string | null;
  crmNovo: string | null;
  status: SolicitacaoStatus;
  motivoRejeicao: string | null;
  analisadoPor: string | null;
  analisadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  usuario?: Usuario;
};
