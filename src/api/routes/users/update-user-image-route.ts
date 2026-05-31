import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';
import { auth } from '@/lib/auth';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function updateUserImageRoute(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();
  const session = await auth.api.getSession({ headers: request.headers });
  const auditLogService = new AuditLogService(new DrizzleAuditLogsRepository());

  if (!file) {
    throw new ValidationError(
      [{ path: ['image'], message: 'Arquivo de imagem não enviado.' }],
      true,
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
    throw new ValidationError([{ path: ['image'], message: 'Formato de imagem inválido.' }], true);
  }

  const imageBuffer = await file.toBuffer();

  const usecase = container.resolve('updateUserImageUsecase');

  const { url } = await usecase.execute({
    idUsuario: request.user!.id,
    imageBuffer,
    contentType: file.mimetype,
  });

  await auditLogService.register({
    action: 'UPDATE_IMAGE',
    category: 'USER_MANAGEMENT',
    description: `Usuário ${request.user!.id} atualizou sua imagem de perfil`,
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
      imageUrl: url,
    },
  });

  return reply.status(200).send({ url });
}
