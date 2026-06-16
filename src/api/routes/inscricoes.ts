import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { enviarConvitesEmLoteRoute } from './inscricoes/enviar-convites-em-lote';
import { submeterInscricaoRoute } from './inscricoes/submeter-inscricao';
import { listarInscricoesRoute } from './inscricoes/listar-inscricoes';
import { avaliarInscricaoRoute } from './inscricoes/avaliar-inscricao';

// eslint-disable-next-line @typescript-eslint/require-await
export async function inscricoesRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: 'POST',
    url: '/inscricoes/convites',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    handler: enviarConvitesEmLoteRoute,
  });

  app.route({
    method: 'POST',
    url: '/inscricoes/submeter',
    handler: submeterInscricaoRoute,
  });

  app.route({
    method: 'GET',
    url: '/inscricoes',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    handler: listarInscricoesRoute,
  });

  app.route({
    method: 'PATCH',
    url: '/inscricoes/:id/avaliar',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    handler: avaliarInscricaoRoute,
  });
}
