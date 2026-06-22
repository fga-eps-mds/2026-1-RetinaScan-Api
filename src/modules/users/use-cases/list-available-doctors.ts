import type { UsuariosRepository } from '@/modules/users/repositories';

export type ListAvailableDoctorsOutput = {
  id: string;
  nomeCompleto: string;
  email: string;
}[];

export class ListAvailableDoctorsUseCase {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  async execute(busca?: string): Promise<ListAvailableDoctorsOutput> {
    const usuarios = await this.usuariosRepository.searchAvailableDoctors(busca);

    return usuarios.map((u) => ({
      id: u.id,
      nomeCompleto: u.nomeCompleto,
      email: u.email,
    }));
  }
}
