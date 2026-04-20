import { auth } from '@/lib/auth';
import type {
  AuthService,
  ChangeEmailInput,
  ChangePasswordInput,
} from '@/shared/services/auth-service';
import { ConflictError } from '@/shared/errors/conflict-error';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

type BetterAuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: number;
  body?: {
    message?: string;
    code?: string;
  };
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const err = error as Error & BetterAuthErrorLike;
    return {
      message: err.message,
      code: err.code ?? err.body?.code,
      status: err.status ?? err.statusCode,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as BetterAuthErrorLike;
    return {
      message: err.message ?? err.body?.message ?? 'Erro desconhecido',
      code: err.code ?? err.body?.code,
      status: err.status ?? err.statusCode,
    };
  }

  return {
    message: 'Erro desconhecido',
    code: undefined,
    status: undefined,
  };
};

const mapBetterAuthError = (error: unknown): never => {
  const { message, code, status } = getErrorDetails(error);

  console.error('BetterAuth error:', {
    code,
    status,
    message,
    raw: error,
  });

  if (code === "email_doesn't_match") {
    throw new ConflictError('O email informado não corresponde ao usuário autenticado.');
  }

  if (code === 'email_not_found') {
    throw new ConflictError('Email não encontrado.');
  }

  if (status === 401) {
    throw new UnauthorizedError('Senha atual inválida.');
  }

  if (
    message.toLowerCase().includes('password') ||
    message.toLowerCase().includes('credential') ||
    message.toLowerCase().includes('invalid password')
  ) {
    throw new UnauthorizedError('Senha atual inválida.');
  }

  if (message.toLowerCase().includes('email') && message.toLowerCase().includes('already')) {
    throw new ConflictError('Este email já está em uso.');
  }

  if (code === 'internal_server_error' || status === 500) {
    throw new Error('Erro interno ao processar autenticação.');
  }

  throw new Error(message || 'Erro ao processar autenticação.');
};

export class BetterAuthService implements AuthService {
  async changePassword(input: ChangePasswordInput, headers: Headers): Promise<void> {
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          revokeOtherSessions: input.revokeOtherSessions,
        },
        headers,
      });
    } catch (error: unknown) {
      mapBetterAuthError(error);
    }
  }

  async changeEmail(input: ChangeEmailInput, headers: Headers): Promise<void> {
    try {
      await auth.api.changeEmail({
        body: {
          newEmail: input.newEmail,
        },
        headers,
      });
    } catch (error: unknown) {
      mapBetterAuthError(error);
    }
  }
}
