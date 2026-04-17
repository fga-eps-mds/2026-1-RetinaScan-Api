export type Usuario = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dtNascimento: string | null;
  crm: string | null;
  email: string;
  tipoPerfil: 'ADMIN' | 'MEDICO';
  status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
};
