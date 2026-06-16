import type { TipoPerfil } from './usuario';

export const inscricaoStatus = {
  CONVITE_ENVIADO: 'CONVITE_ENVIADO',
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
  EXPIRADA: 'EXPIRADA',
} as const;

export type InscricaoStatus = keyof typeof inscricaoStatus;

export type InscricaoMedico = {
  id: string;
  email: string;
  token: string;
  tokenExpiresAt: Date;
  status: InscricaoStatus;
  nomeCompleto: string | null;
  cpf: string | null;
  crm: string | null;
  dtNascimento: Date | null;
  tipoPerfil: TipoPerfil | null;
  encryptedPassword: string | null;
  motivoRejeicao: string | null;
  analisadoPor: string | null;
  analisadoEm: Date | null;
  submittedAt: Date | null;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};
