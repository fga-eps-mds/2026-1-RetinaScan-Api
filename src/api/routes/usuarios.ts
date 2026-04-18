import { auth } from '@/lib/auth';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { UnauthorizedError } from '@/shared/errors';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { updateUserRoute } from './users/update-user-route';
import { updateUserImageRoute } from './users/update-user-image-route';
import { tiposPerfil } from '@/modules/users/domain';

// eslint-disable-next-line @typescript-eslint/require-await
export async function usuarioRoutes(app: FastifyInstance): Promise<void> {
  app.post('/usuarios', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedError('Usuário não autenticado');
    }

    if (session.user.tipoPerfil !== 'ADMIN') {
      throw new UnauthorizedError('Acesso negado: apenas administradores podem criar usuários');
    }

    const bodySchema = z.object({
      nomeCompleto: z.string().min(3, 'Nome inválido.'),
      email: z.string().email('Email inválido.'),
      cpf: z.string().refine(isValidCpf, {
        message: 'CPF inválido.',
      }),
      crm: z.string().min(1, 'CRM obrigatório.'),
      dtNascimento: z.string().date().pipe(z.coerce.date()),
      senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
      tipoPerfil: z.enum(['ADMIN', 'MEDICO']),
    });

    const result = bodySchema.safeParse(request.body);

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();

      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos.',
        errors: fieldErrors,
      });
    }

    const body = result.data;

    const useCase = new CreateUserByAdmin(new DrizzleUsuariosRepository());

    await useCase.execute(body);

    return reply.status(201).send({ message: 'Usuário criado com sucesso.' });
  });

  app.put(
    '/usuarios',
    {
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserRoute,
  );

  app.patch(
    '/usuarios/imagem',
    {
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserImageRoute,
  );
}
