import type { Exame } from './exam';

export type FindExamInput = {
  examId: string;
};

export type FindManyExamsFilters = Partial<{
  cpf: string;
}>;

export type ExamesRepository = {
  create(input: Exame): Promise<Exame>;
  findOne(input: FindExamInput): Promise<Exame | null>;
  findMany(input: FindManyExamsFilters): Promise<Exame[]>;
};
