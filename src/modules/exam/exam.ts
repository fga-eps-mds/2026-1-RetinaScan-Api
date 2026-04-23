export type Exame = {
  id: string;
  idUsuario: string;
  idPaciente: string;
  dtHora: Date;
  status: ExameStatus;
  comorbidades?: string | null;
  descricao?: string | null;
}

export const ExameStatus = {
  CRIADO: 'CRIADO',
  CONCLUIDO: 'CONCLUIDO',
  EM_PROCESSAMENTO: 'EM_PROCESSAMENTO',
} as const;

export type ExameStatus = keyof typeof ExameStatus;