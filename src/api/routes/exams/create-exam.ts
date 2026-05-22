import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { Sexo } from '@/modules/exam';
import { cpf } from 'cpf-cnpj-validator';

const comorbidadesSchema = z
  .object({
    diabetes: z.boolean().default(false),
    diabetesAnos: z.number().int().min(0, 'diabetesAnos deve ser maior ou igual a 0.').optional(),
    diabetesUsoInsulina: z.boolean().default(false),
    diabetesControlado: z.boolean().default(false),

    hipertensao: z.boolean().default(false),
    hipertensaoControlada: z.boolean().default(false),

    altaMiopia: z.boolean().default(false),
    glaucoma: z.boolean().default(false),
    usoHidroxicloroquina: z.boolean().default(false),
    uveite: z.boolean().default(false),
    catarata: z.boolean().default(false),

    outrasComorbidades: z.boolean().default(false),
    outrasComorbidadesDescricao: z
      .string()
      .trim()
      .min(1, 'outrasComorbidadesDescricao não pode ser vazio.')
      .optional(),

    qualidadeTecnicaDificuldade: z.boolean().default(false),
  })
  .strict({ message: 'Campos inválidos em comorbidades.' })
  .superRefine((data, ctx) => {
    if (data.diabetes && !data.diabetesAnos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['diabetesAnos'],
        message: 'diabetesAnos é obrigatório quando diabetes for true.',
      });
    }

    if (data.outrasComorbidades && !data.outrasComorbidadesDescricao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outrasComorbidadesDescricao'],
        message: 'outrasComorbidadesDescricao é obrigatório quando outrasComorbidades for true.',
      });
    }
  });

const bodySchema = z
  .object({
    nomeCompleto: z.string().trim().min(1, 'nomeCompleto é obrigatório.'),
    cpf: z.string().refine((value) => cpf.isValid(value), { message: 'CPF inválido.' }),
    sexo: z.nativeEnum(Sexo, { message: 'sexo inválido.' }),
    dtNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dtNascimento deve ser AAAA-MM-DD.'),
    dtHora: z.string().datetime({ message: 'dtHora inválida.' }).pipe(z.coerce.date()),
    comorbidades: comorbidadesSchema,
    descricao: z.string().trim().min(1, 'descricao não pode ser vazio.').optional(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function createExam(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('createExamUseCase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    ...result.data,
  });

  return reply.status(201).send(response);
}
