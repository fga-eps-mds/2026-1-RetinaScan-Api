import type { Usuario } from '@/modules/users/domain';

export type UsuarioFindByInput = {
  id?: string;
  email?: string;
  cpf?: string;
  crm?: string;
};
export type UsuarioFindByOutput = Usuario | null;

export type UsuarioUpdateInput = {
  nomeCompleto?: string;
  email?: string;
  dtNascimento?: string;
  image?: string;
};

export type UsuarioUpdateOutput = Usuario | null;

export interface UsuariosRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findByCpf(cpf: string): Promise<Usuario | null>;
  findByCrm(crm: string): Promise<Usuario | null>;
  findBy(params: UsuarioFindByInput): Promise<UsuarioFindByOutput>;
  getAllUsers(): Promise<Usuario[]>;
  update(id: string, params: UsuarioUpdateInput): Promise<UsuarioUpdateOutput>;
}
