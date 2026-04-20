import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { GetAllUsers } from '@/modules/users/use-cases/get-all-users';
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function getAllUsers(request: FastifyRequest, reply: FastifyReply) {
  const useCase = new GetAllUsers(new DrizzleUsuariosRepository());

  const usuarios = await useCase.execute();

  return reply.status(200).send(usuarios);
}
