import z from 'zod';
import { container } from '@/infra/container';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { auth } from '@/lib/auth';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';

const bodySchema = z
  .object({
    nomeCompleto: z.string().min(3, 'Nome inválido.').optional(),
    email: z.string().email('Email inválido.').optional(),
    dtNascimento: z.string().date().optional(),
    senhaAtual: z.string().min(6, 'Senha atual deve ter no mínimo 6 caracteres.').optional(),
    novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres.').optional(),
  })
  .strict({ message: 'Campos inválidos.' })
  .refine(({ senhaAtual, novaSenha }) => Boolean(senhaAtual) === Boolean(novaSenha), {
    message: 'senhaAtual e novaSenha devem ser enviadas juntas.',
    path: ['senhaAtual'],
  });

export async function updateUserRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);
  const session = await auth.api.getSession({ headers: request.headers });
  const auditLogService = new AuditLogService(new DrizzleAuditLogsRepository());

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const { senhaAtual, novaSenha, ...data } = result.data;

  const usecase = container.resolve('updateUserUsecase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    data,
    senhaAtual,
    novaSenha,
    headers: fromNodeHeaders(request.headers),
  });

  await auditLogService.register({
    action: 'UPDATE',
    category: 'USER_MANAGEMENT',
    description: `Usuário ${request.user!.id} atualizou seu perfil`,
    actorName: session?.user.name,
    actorUserId: session?.user.id,
    actorEmail: session?.user.email,
    targetEntityType: 'USER',
    targetEntityId: request.user!.id,
    targetDisplay: request.user!.id,
    ipAddress: session?.session.ipAddress,
    userAgent: session?.session.userAgent,
    requestId: request.id,
    changes: {
      nomeCompleto: response.usuario.nomeCompleto,
      email: response.usuario.email,
      dtNascimento: response.usuario.dtNascimento,
    },
  });

  return reply.status(200).send(response);
}
