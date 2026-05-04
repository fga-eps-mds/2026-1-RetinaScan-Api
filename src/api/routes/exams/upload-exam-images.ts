import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import type {
  UploadExamImageInput,
  UploadExamImagesUseCase,
} from '@/modules/exam/use-cases/upload-exam-images-usecase';

const FIELD_TO_LATERALIDADE: Record<string, LateralidadeOlho | undefined> = {
  olhoDireito: LateralidadeOlho.OD,
  olhoEsquerdo: LateralidadeOlho.OE,
};

const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const satisfies Record<string, UploadExamImageInput['extension']>;

type AllowedMime = keyof typeof MIME_TO_EXTENSION;

const isAllowedMime = (mime: string): mime is AllowedMime => mime in MIME_TO_EXTENSION;

export async function uploadExamImages(
  request: FastifyRequest<{ Params: { examId: string } }>,
  reply: FastifyReply,
) {
  const { examId } = request.params;
  const imagens: UploadExamImageInput[] = [];

  for await (const part of request.parts()) {
    if (part.type !== 'file') continue;

    const lateralidade = FIELD_TO_LATERALIDADE[part.fieldname];
    if (!lateralidade) {
      throw new ValidationError(
        [{ path: [part.fieldname], message: 'Campo de arquivo inválido.' }],
        true,
      );
    }

    if (!isAllowedMime(part.mimetype)) {
      throw new ValidationError(
        [{ path: [part.fieldname], message: 'Formato de imagem inválido.' }],
        true,
      );
    }

    if (imagens.some((img) => img.lateralidade === lateralidade)) {
      throw new ValidationError(
        [{ path: [part.fieldname], message: 'Arquivo duplicado para o mesmo olho.' }],
        true,
      );
    }

    imagens.push({
      lateralidade,
      buffer: await part.toBuffer(),
      contentType: part.mimetype,
      extension: MIME_TO_EXTENSION[part.mimetype],
    });
  }

  if (imagens.length === 0) {
    throw new ValidationError(
      [{ path: ['imagens'], message: 'Envie pelo menos uma imagem' }],
      true,
    );
  }

  const usecase: UploadExamImagesUseCase = container.resolve('uploadExamImagesUseCase');
  const response = await usecase.execute({
    examId,
    userId: request.user!.id,
    imagens,
  });

  return reply.status(201).send(response);
}
