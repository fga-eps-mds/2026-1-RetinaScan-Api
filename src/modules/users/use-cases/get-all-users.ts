import type { Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../repositories/users-repository';

export class GetAllUsers {
  constructor(private usuariosRepository: UsuariosRepository) {}

  async execute(): Promise<Usuario[]> {
    return this.usuariosRepository.getAllUsers();
  }
}
