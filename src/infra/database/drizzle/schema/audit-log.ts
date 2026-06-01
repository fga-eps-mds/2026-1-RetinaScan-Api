import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuario } from './user';

export const auditLog = pgTable(
  'audit_log',
  {
    idLog: uuid('id_log').defaultRandom().primaryKey(),

    action: varchar('action', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    description: text('description').notNull(),

    actorUserId: text('actor_user_id').references(() => usuario.id, { onDelete: 'set null' }),
    actorName: varchar('actor_name', { length: 255 }),
    actorEmail: varchar('actor_email', { length: 255 }),

    targetEntityType: varchar('target_entity_type', { length: 100 }),
    targetEntityId: text('target_entity_id'),
    targetDisplay: varchar('target_display', { length: 255 }),

    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 100 }),

    changes: jsonb('changes_json').$type<Record<string, unknown> | null>(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
    actionIdx: index('audit_log_action_idx').on(table.action),
    actorUserIdIdx: index('audit_log_actor_user_id_idx').on(table.actorUserId),
    categoryIdx: index('audit_log_category_idx').on(table.category),
    targetIdx: index('audit_log_target_idx').on(table.targetEntityType, table.targetEntityId),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  ator: one(usuario, {
    fields: [auditLog.actorUserId],
    references: [usuario.id],
  }),
}));
