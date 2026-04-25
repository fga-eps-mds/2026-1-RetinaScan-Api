export type Exame = {
  id: string;
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  status: ExameStatus;
  comorbidades?: string | null;
  descricao?: string | null;
};

export const ExameStatus = {
  CRIADO: 'CRIADO',
  CONCLUIDO: 'CONCLUIDO',
  EM_PROCESSAMENTO: 'EM_PROCESSAMENTO',
} as const;

export type ExameStatus = keyof typeof ExameStatus;

export const Sexo = {
  MASCULINO: 'MASCULINO',
  FEMININO: 'FEMININO',
  OUTRO: 'OUTRO',
} as const;

export type Sexo = keyof typeof Sexo;
