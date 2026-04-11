import { auth } from '@/infra/auth/better-auth';
import type { IAuthService, SignUpInput } from '@/application/ports/services/auth-service';

export class BetterAuthService implements IAuthService {
  async signUp(input: SignUpInput): Promise<void> {
    await auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        birthDate: input.birthDate,
        crm: input.crm,
        cpf: input.cpf,
        identityNumber: input.identityNumber,
      },
    });
  }
}
