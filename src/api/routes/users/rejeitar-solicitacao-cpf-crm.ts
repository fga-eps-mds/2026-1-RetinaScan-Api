import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';
import { auth } from '@/lib/auth';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';

const paramsSchema = z
  .object({
    id: z.string().min(1, 'Id da solicitação obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

const bodySchema = z
  .object({
    motivoRejeicao: z.string().trim().min(1, 'Motivo da rejeição obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function rejeitarSolicitacaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const paramsResult = paramsSchema.safeParse(request.params);
  const auditLogService = new AuditLogService(new DrizzleAuditLogsRepository());
  const session = await auth.api.getSession({ headers: request.headers });

  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.issues, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.issues, true);
  }

  const usecase = container.resolve('rejeitarSolicitacaoCpfCrmUsecase');

  const response = await usecase.execute({
    idSolicitacao: paramsResult.data.id,
    idAdmin: request.user!.id,
    motivoRejeicao: bodyResult.data.motivoRejeicao,
  });

  await auditLogService.register({
    action: 'REJECT',
    category: 'USER_MANAGEMENT',
    description: `Solicitação de CPF/CRM ${paramsResult.data.id} rejeitada por admin ${session?.user.email}`,
    actorName: session?.user.name,
    actorUserId: session?.user.id,
    actorEmail: session?.user.email,
    targetEntityType: 'SOLICITATION',
    targetEntityId: paramsResult.data.id,
    targetDisplay: paramsResult.data.id,
    ipAddress: session?.session.ipAddress,
    userAgent: session?.session.userAgent,
    requestId: request.id,
    changes: {
      solicitacao: response.solicitacao,
      motivoRejeicao: bodyResult.data.motivoRejeicao,
    },
    metadata: {
      idSolicitacao: paramsResult.data.id,
    },
  });

  return reply.status(200).send(response);
}
