import {
  pgTable,
  timestamp,
  varchar,
  uuid,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { exam } from './exam';

export const patient = pgTable(
  'paciente',
  {
    idPaciente: uuid('id_paciente').primaryKey(),
    nomeCompleto: varchar('nome_completo', { length: 150 }).notNull(),
    cpf: varchar('cpf', { length: 14 }).notNull(),
    dtNascimento: date('data_nascimento').notNull(),
    sexo: varchar('sexo', { length: 20 }).notNull(),
    numProntuario: varchar('num_prontuario', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('cpf_unique_index').on(table.cpf),
    uniqueIndex('num_prontuario_unique_index').on(table.numProntuario),
  ],
);

export const pacientRelations = relations(patient, ({ many }) => ({
  exams: many(exam),
}));
