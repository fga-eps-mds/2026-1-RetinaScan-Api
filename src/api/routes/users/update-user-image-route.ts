import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';

// Define os formatos de imagem permitidos para atualização da foto do usuário.
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function updateUserImageRoute(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();

  // Garante que uma imagem foi enviada na requisição.
  if (!file) {
    throw new ValidationError(
      [{ path: ['image'], message: 'Arquivo de imagem não enviado.' }],
      true,
    );
  }

  // Valida se o arquivo recebido possui um formato de imagem suportado pela aplicação.
  if (!ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
    throw new ValidationError([{ path: ['image'], message: 'Formato de imagem inválido.' }], true);
  }

  const imageBuffer = await file.toBuffer();

  // Obtém o caso de uso responsável pelo processamento e armazenamento da imagem.
  const usecase = container.resolve('updateUserImageUsecase');

  const { url } = await usecase.execute({
    idUsuario: request.user!.id,
    imageBuffer,
    contentType: file.mimetype,
  });

  return reply.status(200).send({ url });
}
