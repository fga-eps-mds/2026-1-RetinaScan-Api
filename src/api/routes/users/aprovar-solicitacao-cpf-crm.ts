import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';
import { auth } from '@/lib/auth';
import { getErrorCode } from '@/shared/errors/get-error-code';

const paramsSchema = z
  .object({
    id: z.string().min(1, 'Id da solicitação obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function aprovarSolicitacaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = paramsSchema.safeParse(request.params);
  const auditLogsService = new AuditLogService(new DrizzleAuditLogsRepository());
  const session = await auth.api.getSession({ headers: request.headers });

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  try {
    const usecase = container.resolve('aprovarSolicitacaoCpfCrmUsecase');

    const response = await usecase.execute({
      idSolicitacao: result.data.id,
      idAdmin: request.user!.id,
    });

    await auditLogsService.register({
      action: 'APPROVE',
      category: 'USER_MANAGEMENT',
      description: `Solicitação de CPF/CRM ${result.data.id} aprovada por admin ${session?.user.email}`,
      actorName: session?.user.name,
      actorUserId: session?.user.id,
      actorEmail: session?.user.email,
      targetEntityType: 'SOLICITATION',
      targetEntityId: result.data.id,
      targetDisplay: result.data.id,
      ipAddress: session?.session.ipAddress,
      userAgent: session?.session.userAgent,
      requestId: request.id,
      changes: {
        solicitacao: response.solicitacao,
        notificacaoEnviada: response.notificacaoEnviada,
      },
      metadata: {
        idSolicitacao: result.data.id,
      },
    });

    return reply.status(200).send(response);
  } catch (error) {
    await auditLogsService.register({
      action: 'APPROVE_FAILED',
      category: 'USER_MANAGEMENT',
      description: `Falha ao aprovar solicitação de CPF/CRM ${result.data.id}`,
      actorName: session?.user.name,
      actorUserId: session?.user.id,
      actorEmail: session?.user.email,
      targetEntityType: 'SOLICITATION',
      targetEntityId: result.data.id,
      targetDisplay: result.data.id,
      ipAddress: session?.session.ipAddress,
      userAgent: session?.session.userAgent,
      requestId: request.id,
      changes: {
        errorMessage: getErrorCode(error) || 'Unknown error',
      },
      metadata: {
        idSolicitacao: result.data.id,
        errorStack: error instanceof Error ? error.stack : null,
      },
    });

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Ocorreu um erro ao aprovar a solicitação.',
    });
  }
}
