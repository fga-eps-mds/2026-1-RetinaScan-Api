import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors/validation-error';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const bodySchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    nomeCompleto: z.string().min(1, 'Nome completo é obrigatório'),
    cpf: z.string().min(11, 'CPF inválido'),
    crm: z.string().min(1, 'CRM é obrigatório'),
    dtNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
    senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  })
  .strict();

export async function submeterInscricaoRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = bodySchema.safeParse(request.body);
  if (!result.success) throw new ValidationError(result.error.issues, true);

  const usecase = container.resolve('submeterInscricaoUsecase');
  await usecase.execute(result.data);

  await reply.status(200).send({ message: 'Inscrição recebida com sucesso.' });
}
