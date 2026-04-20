import { vi, type MockInstance } from 'vitest';
import { auth } from '@/lib/auth';
import type { TipoPerfil } from '@/modules/users/domain';

type GetSessionReturn = Awaited<ReturnType<typeof auth.api.getSession>>;
type ChangeEmailReturn = Awaited<ReturnType<typeof auth.api.changeEmail>>;
type ChangePasswordReturn = Awaited<ReturnType<typeof auth.api.changePassword>>;

export interface SessionUser {
  id: string;
  email: string;
  nomeCompleto: string;
  tipoPerfil: TipoPerfil;
}

export function spyOnAuthApi() {
  const getSessionSpy = vi.spyOn(auth.api, 'getSession');
  const changeEmailSpy = vi.spyOn(auth.api, 'changeEmail');
  const changePasswordSpy = vi.spyOn(auth.api, 'changePassword');

  return {
    getSessionSpy,
    changeEmailSpy,
    changePasswordSpy,

    authenticateAs(user: SessionUser): void {
      getSessionSpy.mockResolvedValue({
        user: {
          id: user.id,
          email: user.email,
          name: user.nomeCompleto,
          tipoPerfil: user.tipoPerfil,
        },
      } as GetSessionReturn);
    },

    unauthenticate(): void {
      getSessionSpy.mockResolvedValue(null as GetSessionReturn);
    },

    stubChangeEmail(spy: MockInstance = changeEmailSpy): void {
      spy.mockResolvedValue(undefined as unknown as ChangeEmailReturn);
    },

    stubChangePassword(spy: MockInstance = changePasswordSpy): void {
      spy.mockResolvedValue(undefined as unknown as ChangePasswordReturn);
    },

    resetAll(): void {
      getSessionSpy.mockReset();
      changeEmailSpy.mockReset().mockResolvedValue(undefined as unknown as ChangeEmailReturn);
      changePasswordSpy.mockReset().mockResolvedValue(
        undefined as unknown as ChangePasswordReturn,
      );
    },

    restoreAll(): void {
      getSessionSpy.mockRestore();
      changeEmailSpy.mockRestore();
      changePasswordSpy.mockRestore();
    },
  };
}
