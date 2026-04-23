export type Paciente = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  numProntuario: string;
}

export const Sexo = {
  MASCULINO: 'MASCULINO',
  FEMININO: 'FEMININO',
  OUTRO: 'OUTRO',
} as const;

export type Sexo = keyof typeof Sexo;