import type { UsuariosRepository } from '@/modules/users/repositories';

export type ListAvailableDoctorsOutput = {
  id: string;
  nomeCompleto: string;
  email: string;
}[];

export type ListAvailableDoctorsInput = {
  busca?: string;
  requesterId: string;
};

export class ListAvailableDoctorsUseCase {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  async execute(input: ListAvailableDoctorsInput): Promise<ListAvailableDoctorsOutput> {
    const usuarios = await this.usuariosRepository.searchAvailableDoctors(
      input.busca,
      input.requesterId,
    );

    return usuarios.map((u) => ({
      id: u.id,
      nomeCompleto: u.nomeCompleto,
      email: u.email,
    }));
  }
}
