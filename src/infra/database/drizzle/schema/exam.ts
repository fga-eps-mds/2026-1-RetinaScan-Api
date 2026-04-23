import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { usuario } from './user';
import { patient } from './patient';


export const exam = pgTable(
  'exame',
  {
    idExame: uuid('id_exame').primaryKey(),
    idUsuario: text('id_usuario')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    idPaciente: text('id_paciente')
      .notNull()
      .references(() => patient.idPaciente, { onDelete: 'restrict' }),
    dtHora: timestamp('data_hora').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    comorbidades: text('comorbidades'),
    descricao: text('descricao'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

export const examRelations = relations(exam, ({ one }) => ({
  usuario: one(usuario, {
    fields: [exam.idUsuario],
    references: [usuario.id],
  }),
  paciente: one(patient, {
    fields: [exam.idPaciente],
    references: [patient.idPaciente],
  }),
}));
