export type Usuario = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dtNascimento: string | null;
  crm: string | null;
  email: string;
  tipoPerfil: TipoPerfil;
  status: StatusUsuario;
  image?: string | null;
};

export const tiposPerfil = {
  ADMIN: 'ADMIN',
  MEDICO: 'MEDICO',
} as const;

export type TipoPerfil = keyof typeof tiposPerfil;

export const statusUsuario = {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  BLOQUEADO: 'BLOQUEADO',
} as const;

export type StatusUsuario = keyof typeof statusUsuario;
