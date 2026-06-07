import { pgTable, text, timestamp, uuid, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { exam } from './exam';
import { usuario } from './user';
import { relations } from 'drizzle-orm';

export const specialistReport = pgTable(
  'laudo_especialista',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('id_exame')
      .notNull()
      .references(() => exam.idExame, { onDelete: 'cascade' }),
    specialistId: text('id_especialista')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    texto: text('texto').notNull(),
    resultadoIaValido: boolean('resultado_ia_valido').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('laudo_especialista_exam_unique').on(table.examId)],
);

export const specialistReportRelations = relations(specialistReport, ({ one }) => ({
  exam: one(exam, {
    fields: [specialistReport.examId],
    references: [exam.idExame],
  }),
  specialist: one(usuario, {
    fields: [specialistReport.specialistId],
    references: [usuario.id],
  }),
}));
