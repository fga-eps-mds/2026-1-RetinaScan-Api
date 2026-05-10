export const OlhoExame = {
  AO: 'AO',
  OD: 'OD',
  OE: 'OE',
} as const;

export type OlhoExame = keyof typeof OlhoExame;

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

export type Exame = {
  id: string;
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  status: ExameStatus;
  olho?: OlhoExame | null;
  comorbidades?: string | null;
  descricao?: string | null;
};
