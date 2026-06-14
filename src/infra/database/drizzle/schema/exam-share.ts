import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { exam } from './exam';
import { usuario } from './user';

export const examShare = pgTable('exam_share', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exam.idExame, { onDelete: 'cascade' }),
  medicoDestinoId: text('medico_destino_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  compartilhadoPor: text('compartilhado_por')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  ativo: boolean('ativo').default(true).notNull(),
  expiraEm: timestamp('expira_em'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const examShareRelations = relations(examShare, ({ one }) => ({
  exame: one(exam, {
    fields: [examShare.examId],
    references: [exam.idExame],
  }),
  medicoDestino: one(usuario, {
    fields: [examShare.medicoDestinoId],
    references: [usuario.id],
  }),
  especialista: one(usuario, {
    fields: [examShare.compartilhadoPor],
    references: [usuario.id],
  }),
}));
