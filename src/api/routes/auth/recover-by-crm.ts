import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { auth } from '@/lib/auth';
import { env } from '@/env';

const recoverByCrmSchema = z.object({
  crm: z.string().min(1, 'CRM é obrigatório'),
  redirectTo: z.string().url('A URL de redirecionamento deve ser válida').optional(),
});

export async function recoverByCrmHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parseResult = recoverByCrmSchema.safeParse(request.body);

  if (!parseResult.success) {
    throw new ValidationError(parseResult.error.issues, true);
  }

  const { crm, redirectTo } = parseResult.data;

  const usecase = container.resolve('recoverPasswordByCrmUseCase');

  const { email, maskedEmail } = await usecase.execute({ crm });

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.append(key, String(value));
  }

  // Aciona o better-auth para criar o token e enviar o e-mail de recuperação
  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: redirectTo || `${env.BETTER_AUTH_URL || `http://localhost:${env.PORT}`}/reset-password`,
    },
    headers,
  });

  return reply.status(200).send({
    message: 'Se houver uma conta com este CRM, um e-mail de recuperação será enviado.',
    maskedEmail,
  });
}
