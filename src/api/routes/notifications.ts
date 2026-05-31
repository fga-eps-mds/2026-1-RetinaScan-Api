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

export type ListNotificationsQuery = {
  status?: 'todas' | 'nao-lidas' | 'lidas';
  tipo?: string;
  limit?: string | number;
};

type NotificationParams = {
  id: string;
};

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
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO]),
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
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO]),
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
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO]),
      ],
    },
    deleteNotification,
  );
}
