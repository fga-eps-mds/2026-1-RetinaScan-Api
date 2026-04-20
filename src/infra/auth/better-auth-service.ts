import { auth } from '@/lib/auth';
import type {
  AuthService,
  ChangeEmailInput,
  ChangePasswordInput,
} from '@/shared/services/auth-service';

export class BetterAuthService implements AuthService {
  async changePassword(input: ChangePasswordInput, headers: Headers): Promise<void> {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: input.revokeOtherSessions,
      },
      headers,
    });
  }

  async changeEmail(input: ChangeEmailInput, headers: Headers): Promise<void> {
    await auth.api.changeEmail({
      body: {
        newEmail: input.newEmail,
      },
      headers,
    });
  }
}
