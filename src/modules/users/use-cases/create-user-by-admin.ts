import { ConflictError } from '@/shared/errors/conflict-error';
import type { UsuariosRepository } from '../repositories/users-repository';
import { auth } from '@/lib/auth';
import { env } from '@/env';

type Request = {
  nomeCompleto: string;
  email: string;
  cpf: string;
  crm: string;
  dtNascimento: Date;
  senha: string;
  tipoPerfil: 'ADMIN' | 'MEDICO';
};

export class CreateUserByAdmin {
  constructor(private UsuariosRepository: UsuariosRepository) {}

  async execute(data: Request): Promise<void> {
    if (await this.UsuariosRepository.findByEmail(data.email)) {
      throw new ConflictError('Email já cadastrado');
    }

    if (await this.UsuariosRepository.findByCpf(data.cpf)) {
      throw new ConflictError('CPF já cadastrado');
    }

    if (await this.UsuariosRepository.findByCrm(data.crm)) {
      throw new ConflictError('CRM já cadastrado');
    }

    await auth.api.signUpEmail({
      body: {
        name: data.nomeCompleto,
        email: data.email,
        password: data.senha,
        cpf: data.cpf,
        crm: data.crm || '',
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        dtNascimento: new Date(env.ADMIN_BIRTH_DATE ?? new Date()),
      },
    });
  }
}
