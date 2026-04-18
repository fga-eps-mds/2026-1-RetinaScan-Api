import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function updateUserImageRoute(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();

  if (!file) {
    throw new ValidationError(
      [{ path: ['image'], message: 'Arquivo de imagem não enviado.' }],
      true,
    );
  }

  if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
    throw new ValidationError([{ path: ['image'], message: 'Formato de imagem inválido.' }], true);
  }

  const imageBuffer = await file.toBuffer();

  const usecase = container.resolve('updateUserImageUsecase');

  const { url } = await usecase.execute({
    idUsuario: request.user!.id,
    imageBuffer,
    contentType: file.mimetype,
  });

  return reply.status(200).send({ url });
}
