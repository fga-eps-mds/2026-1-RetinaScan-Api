import { container } from '@/infra/container';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

// Define os campos permitidos para solicitação de alteração de CPF e/ou CRM.
const bodySchema = z
  .object({
    cpfNovo: z.string().refine(isValidCpf, { message: 'CPF inválido.' }).optional(),
    crmNovo: z.string().trim().min(1, 'CRM obrigatório.').optional(),
  })
  .strict({ message: 'Campos inválidos.' })
  // Garante que pelo menos um dado seja informado para alteração.
  .refine((data) => data.cpfNovo !== undefined || data.crmNovo !== undefined, {
    message: 'Informe ao menos CPF ou CRM para alteração.',
    path: ['cpfNovo'],
  });

export async function solicitarAlteracaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);
  // Impede a criação da solicitação caso os dados enviados sejam inválidos.
  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  // Obtém o caso de uso responsável pela criação da solicitação de alteração.
  const usecase = container.resolve('solicitarAlteracaoCpfCrmUsecase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    cpfNovo: result.data.cpfNovo,
    crmNovo: result.data.crmNovo,
  });

  return reply.status(201).send(response);
}
