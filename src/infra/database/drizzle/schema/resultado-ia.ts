import { pgTable, timestamp, varchar, uuid, integer, real, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { imagem } from './image';

export const resultadoIa = pgTable('resultado_ia', {
  idResultadoIa: uuid('id_resultado_ia').primaryKey(),
  idImagem: uuid('id_imagem')
    .notNull()
    .unique()
    .references(() => imagem.idImagem, { onDelete: 'cascade' }),
  predictedClass: integer('predicted_class').notNull(),
  predictedLabel: varchar('predicted_label', { length: 50 }).notNull(),
  confidence: real('confidence').notNull(),
  probabilities: jsonb('probabilities').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const resultadoIaRelations = relations(resultadoIa, ({ one }) => ({
  imagem: one(imagem, {
    fields: [resultadoIa.idImagem],
    references: [imagem.idImagem],
  }),
}));
