import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { exam } from './exam';

export const examIaError = pgTable('exam_ia_error', {
  idExamIaError: uuid('id_exam_ia_error').primaryKey(),
  idExame: uuid('id_exame')
    .notNull()
    .unique()
    .references(() => exam.idExame, { onDelete: 'cascade' }),
  errorMessage: text('error_message').notNull(),
  traceback: text('traceback'),
  taskId: text('task_id'),
  taskName: text('task_name'),
  args: jsonb('args'),
  dtHora: timestamp('dt_hora').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const examIaErrorRelations = relations(examIaError, ({ one }) => ({
  exame: one(exam, {
    fields: [examIaError.idExame],
    references: [exam.idExame],
  }),
}));
