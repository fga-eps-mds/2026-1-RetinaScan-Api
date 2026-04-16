import { db } from '@/infra/database/drizzle/connection';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '@/infra/database/drizzle/schema';
import { env } from '@/env';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL || `http://localhost:${env.PORT}`,
  trustedOrigins: env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),

  emailAndPassword: {
    enabled: true,
  },

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  user: {
    modelName: 'usuario',

    fields: {
      id: 'id_usuario',
      name: 'nomeCompleto',
      email: 'email',
      emailVerified: 'emailVerified',
      image: 'imagem',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },

    additionalFields: {
      cpf: {
        type: 'string',
        databaseName: 'cpf',
        required: true,
        returned: true,
      },

      crm: {
        type: 'string',
        databaseName: 'crm',
        required: true,
        returned: true,
      },

      dtNascimento: {
        type: 'date',
        databaseName: 'dt_nascimento',
        returned: true,
      },

      tipoPerfil: {
        type: 'string',
        databaseName: 'tipo_perfil',
        defaultValue: 'MEDICO',
        returned: true,
      },

      status: {
        type: 'string',
        databaseName: 'status',
        defaultValue: 'ATIVO',
        returned: true,
      },
    },
  },

  session: {
    modelName: 'session',
  },

  account: {
    modelName: 'account',
  },

  verification: {
    modelName: 'verification',
  },
});
