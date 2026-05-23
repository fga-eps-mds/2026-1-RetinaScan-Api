import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { usuario } from './user';

export const notificacao = pgTable(
  'notificacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, {
        onDelete: 'cascade',
      }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    mensagem: text('mensagem').notNull(),
    dados: jsonb('dados').$type<Record<string, unknown> | null>(),
    chaveDedupe: text('chave_dedupe').notNull(),
    lidaEm: timestamp('lida_em').$type<Date | null>(),
    enviadaEmTempoRealEm: timestamp('enviada_em_tempo_real_em').$type<Date | null>(),
    enviadaPorEmailEm: timestamp('enviada_por_email_em').$type<Date | null>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    notificacoesUsuarioIdIdx: index('notificacoes_usuario_id_idx').on(table.usuarioId),

    notificacoesTipoIdx: index('notificacoes_tipo_idx').on(table.tipo),

    notificacoesCriadaEmIdx: index('notificacoes_created_at_idx').on(table.createdAt),

    notificacoesLidaEmIdx: index('notificacoes_lida_em_idx').on(table.lidaEm),

    notificacoesChaveDedupeUid: uniqueIndex('notificacoes_chave_dedupe_uidx').on(table.chaveDedupe),
  }),
);
