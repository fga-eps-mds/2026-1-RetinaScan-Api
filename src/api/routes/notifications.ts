import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { listNotifications } from './notification/list-notifications';
import { markNotificationAsRead } from './notification/mark-notification-as-read';
import { deleteNotification } from './notification/delete-notification';
import {
  listNotificationsSchema,
  markNotificationAsReadSchema,
  deleteNotificationSchema,
} from '../docs/notification';

// Define os filtros opcionais disponíveis para consulta das notificações.
export type ListNotificationsQuery = {
  status?: 'todas' | 'nao-lidas' | 'lidas';
  tipo?: string;
  limit?: string | number;
};

// Define os parâmetros utilizados nas rotas que operam sobre uma notificação específica.
type NotificationParams = {
  id: string;
};

// Registra as rotas de gerenciamento de notificações do usuário autenticado.
// eslint-disable-next-line @typescript-eslint/require-await
export default async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: ListNotificationsQuery;
  }>(
    '/notifications/me',
    {
      schema: listNotificationsSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
    },
    listNotifications,
  );

  app.patch<{ Params: NotificationParams }>(
    '/notifications/:id/read',
    {
      schema: markNotificationAsReadSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
    },
    markNotificationAsRead,
  );

  app.delete<{ Params: NotificationParams }>(
    '/notifications/:id',
    {
      schema: deleteNotificationSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
    },
    deleteNotification,
  );
}
