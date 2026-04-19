import { NotFoundError } from '@/shared/errors';
import type { Usuario } from '@/modules/users/domain';
import { ConflictError } from '@/shared/errors/conflict-error';
import type { AuthService } from '@/shared/services/auth-service';
import type { UsuariosRepository, UsuarioUpdateInput } from '@/modules/users/repositories';

export interface UpdateUserInput {
  idUsuario: string;
  headers: Headers;
  data: UsuarioUpdateInput;
  senhaAtual?: string;
  novaSenha?: string;
}

export interface UpdateUserOutput {
  usuario: Usuario;
}

export class UpdateUserUsecase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.getUser(input.idUsuario);

    await this.validateEmailUniqueness(user, input.data.email);
    await this.handlePasswordUpdate(input.headers, input.senhaAtual, input.novaSenha);

    const { email, ...repoData } = input.data;

    await this.handleEmailUpdate(input.headers, user.email, email);

    const updated = await this.usuariosRepository.update(input.idUsuario, repoData);

    return { usuario: updated! };
  }

  private async handleEmailUpdate(
    headers: Headers,
    emailAtual: string,
    novoEmail?: string,
  ): Promise<void> {
    if (!novoEmail || novoEmail === emailAtual) {
      return;
    }

    await this.authService.changeEmail({ newEmail: novoEmail }, headers);
  }

  private async getUser(id: string): Promise<Usuario> {
    const user = await this.usuariosRepository.findBy({ id });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }

  private async validateEmailUniqueness(user: Usuario, email?: string): Promise<void> {
    if (!email || email === user.email) {
      return;
    }

    const existingUser = await this.usuariosRepository.findBy({ email });

    if (existingUser && existingUser.id !== user.id) {
      throw new ConflictError('Email já cadastrado');
    }
  }

  private async handlePasswordUpdate(
    headers: Headers,
    senhaAtual?: string,
    novaSenha?: string,
  ): Promise<void> {
    if (senhaAtual && novaSenha) {
      await this.authService.changePassword(
        {
          currentPassword: senhaAtual,
          newPassword: novaSenha,
        },
        headers,
      );
    }
  }
}
