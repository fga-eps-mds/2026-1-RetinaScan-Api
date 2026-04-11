import type { IAuthService } from '@/application/ports/services/auth-service';
import type { IUsersRepository } from '@/application/ports/repositories/users-repository';

export interface EnsureAdminExistsInput {
  name: string;
  email: string;
  password: string;
  birthDate: Date;
  crm: string;
  cpf: string;
  identityNumber: string;
}

export class EnsureAdminExistsUseCase {
  constructor(
    private usersRepository: IUsersRepository,
    private authService: IAuthService,
  ) {}

  async execute(input: EnsureAdminExistsInput): Promise<void> {
    const existing = await this.usersRepository.findByEmail(input.email);

    if (existing) return;

    await this.authService.signUp(input);
    await this.usersRepository.updateRoleByEmail(input.email, 'ADMIN');
  }
}
