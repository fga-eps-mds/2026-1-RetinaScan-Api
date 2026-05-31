import { container } from '@/infra/container';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';
import { auth } from '@/lib/auth';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';

const bodySchema = z
  .object({
    cpfNovo: z.string().refine(isValidCpf, { message: 'CPF inválido.' }).optional(),
    crmNovo: z.string().trim().min(1, 'CRM obrigatório.').optional(),
  })
  .strict({ message: 'Campos inválidos.' })
  .refine((data) => data.cpfNovo !== undefined || data.crmNovo !== undefined, {
    message: 'Informe ao menos CPF ou CRM para alteração.',
    path: ['cpfNovo'],
  });

export async function solicitarAlteracaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);
  const session = await auth.api.getSession({ headers: request.headers });
  const auditLogService = new AuditLogService(new DrizzleAuditLogsRepository());

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('solicitarAlteracaoCpfCrmUsecase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    cpfNovo: result.data.cpfNovo,
    crmNovo: result.data.crmNovo,
  });

  await auditLogService.register({
    action: 'REQUEST_CHANGE',
    category: 'USER_MANAGEMENT',
    description: `Usuário ${request.user!.id} solicitou alteração de CPF/CRM`,
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
      cpfNovo: result.data.cpfNovo,
      crmNovo: result.data.crmNovo,
    },
  });

  return reply.status(201).send(response);
}
