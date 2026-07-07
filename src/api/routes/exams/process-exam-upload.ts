import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import type {
  ProcessExamUploadFile,
  ProcessExamUploadUseCase,
} from '@/modules/exam/use-cases/process-exam-upload-usecase';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_FIELDS = new Set(['olhoDireito', 'olhoEsquerdo']);

export async function processExamUpload(request: FastifyRequest, reply: FastifyReply) {
  const arquivos: ProcessExamUploadFile[] = [];

  // Processa os arquivos enviados via multipart, aplicando limites de tamanho e quantidade.
  for await (const part of request.parts({
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 2 },
  })) {
    if (part.type !== 'file') continue;
    // Garante que apenas os campos esperados para imagens de retina sejam aceitos.
    if (!ALLOWED_FIELDS.has(part.fieldname)) {
      throw new ValidationError(
        [
          {
            path: ['arquivo'],
            message: 'Campo de imagem inválido. Use olhoDireito ou olhoEsquerdo.',
          },
        ],
        true,
      );
    }
    arquivos.push({ field: part.fieldname, buffer: await part.toBuffer() });
  }

  // O processamento só pode continuar quando pelo menos uma imagem for enviada.
  if (arquivos.length === 0) {
    throw new ValidationError(
      [{ path: ['imagens'], message: 'Envie pelo menos uma imagem.' }],
      true,
    );
  }

  // Delega o processamento das imagens para o caso de uso, mantendo a regra de negócio isolada.
  const usecase: ProcessExamUploadUseCase = container.resolve('processExamUploadUseCase');
  const response = await usecase.execute({ userId: request.user!.id, arquivos });

  return reply.status(201).send(response);
}
