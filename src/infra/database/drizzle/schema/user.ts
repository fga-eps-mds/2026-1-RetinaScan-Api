import { relations } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const tipoPerfilEnum = pgEnum('tipo_perfil', ['ADMIN', 'MEDICO']);

export const statusUsuarioEnum = pgEnum('status_usuario', ['ATIVO', 'INATIVO', 'BLOQUEADO']);

export const usuario = pgTable(
  'usuario',
  {
    id: text('id_usuario').primaryKey(),

    nomeCompleto: text('nome_completo').notNull(),

    cpf: text('cpf').notNull(),

    dtNascimento: date('dt_nascimento'),

    crm: text('crm').notNull(),

    email: text('email').notNull(),

    tipoPerfil: tipoPerfilEnum('tipo_perfil').default('MEDICO').notNull(),

    status: statusUsuarioEnum('status').default('ATIVO').notNull(),

    emailVerified: boolean('email_verified').default(false).notNull(),

    image: text('image'),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('usuario_email_unique').on(table.email),
    uniqueIndex('usuario_cpf_unique').on(table.cpf),
    uniqueIndex('usuario_crm_unique').on(table.crm),
  ],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),

    expiresAt: timestamp('expires_at').notNull(),

    token: text('token').notNull().unique(),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    ipAddress: text('ip_address'),

    userAgent: text('user_agent'),

    userId: text('user_id')
      .notNull()
      .references(() => usuario.id, {
        onDelete: 'cascade',
      }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),

    accountId: text('account_id').notNull(),

    providerId: text('provider_id').notNull(),

    userId: text('user_id')
      .notNull()
      .references(() => usuario.id, {
        onDelete: 'cascade',
      }),

    accessToken: text('access_token'),

    refreshToken: text('refresh_token'),

    idToken: text('id_token'),

    accessTokenExpiresAt: timestamp('access_token_expires_at'),

    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),

    scope: text('scope'),

    password: text('password'),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),

    identifier: text('identifier').notNull(),

    value: text('value').notNull(),

    expiresAt: timestamp('expires_at').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const usuarioRelations = relations(usuario, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  usuario: one(usuario, {
    fields: [session.userId],
    references: [usuario.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  usuario: one(usuario, {
    fields: [account.userId],
    references: [usuario.id],
  }),
}));
