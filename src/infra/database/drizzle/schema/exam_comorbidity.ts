import { pgTable, uuid, boolean, integer, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { exam } from './exam';

export const examComorbidity = pgTable('exame_comorbidades', {
  id: uuid('id').defaultRandom().primaryKey(),

  idExame: uuid('id_exame')
    .notNull()
    .references(() => exam.idExame, { onDelete: 'cascade' })
    .unique(),

  diabetes: boolean('diabetes').default(false).notNull(),
  diabetesAnos: integer('diabetes_anos'),
  diabetesUsoInsulina: boolean('diabetes_uso_insulina').default(false).notNull(),
  diabetesControlado: boolean('diabetes_controlado').default(false).notNull(),

  hipertensao: boolean('hipertensao').default(false).notNull(),
  hipertensaoControlada: boolean('hipertensao_controlada').default(false).notNull(),

  altaMiopia: boolean('alta_miopia').default(false).notNull(),
  glaucoma: boolean('glaucoma').default(false).notNull(),
  usoHidroxicloroquina: boolean('uso_hidroxicloroquina').default(false).notNull(),
  uveite: boolean('uveite').default(false).notNull(),
  catarata: boolean('catarata').default(false).notNull(),

  outrasComorbidades: boolean('outras_comorbidades').default(false).notNull(),
  outrasComorbidadesDescricao: text('outras_comorbidades_descricao'),

  qualidadeTecnicaDificuldade: boolean('qualidade_tecnica_dificuldade').default(false).notNull(),
});

export const examComorbidityRelations = relations(examComorbidity, ({ one }) => ({
  exame: one(exam, {
    fields: [examComorbidity.idExame],
    references: [exam.idExame],
  }),
}));
