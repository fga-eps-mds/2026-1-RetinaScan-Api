import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function updateUserImageRoute(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();

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

  // await auditLogService.register({
  //   action: 'UPDATE_IMAGE',
  //   category: 'USER_MANAGEMENT',
  //   description: `Usuário ${request.user!.id} atualizou sua imagem de perfil`,
  //   actorName: session?.user.name,
  //   actorUserId: session?.user.id,
  //   actorEmail: session?.user.email,
  //   targetEntityType: 'USER',
  //   targetEntityId: request.user!.id,
  //   targetDisplay: request.user!.id,
  //   ipAddress: session?.session.ipAddress,
  //   userAgent: session?.session.userAgent,
  //   requestId: request.id,
  //   changes: {
  //     imageUrl: url,
  //   },
  // });

  return reply.status(200).send({ url });
}
