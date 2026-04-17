import type { Usuario } from '../domain/usuario';

export interface UsuariosRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findByCpf(cpf: string): Promise<Usuario | null>;
  findByCrm(crm: string): Promise<Usuario | null>;
  getAllUsers(): Promise<Usuario[]>;
}
