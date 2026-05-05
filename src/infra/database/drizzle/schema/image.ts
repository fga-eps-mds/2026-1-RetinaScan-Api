import { pgTable, timestamp, varchar, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { exam } from './exam';

export const imagem = pgTable(
  'imagem',
  {
    idImagem: uuid('id_imagem').primaryKey(),
    idExame: uuid('id_exame')
      .notNull()
      .references(() => exam.idExame, { onDelete: 'cascade' }),
    lateralidadeOlho: varchar('lateralidade_olho', { length: 20 }).notNull(),
    caminhoImg: varchar('caminho_img', { length: 255 }).notNull(),
    qualidadeImg: varchar('qualidade_img', { length: 50 }).default('Pendente').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('imagem_id_exame_lateralidade_uq').on(table.idExame, table.lateralidadeOlho),
    index('imagem_id_exame_idx').on(table.idExame),
  ],
);

export const imagemRelations = relations(imagem, ({ one }) => ({
  exame: one(exam, {
    fields: [imagem.idExame],
    references: [exam.idExame],
  }),
}));
