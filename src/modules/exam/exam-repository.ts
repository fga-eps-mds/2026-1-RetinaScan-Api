import type { Exame } from './exam';

export type FindExameInput = {
  examId?: string;
};

export type ExamesRepository = {
  create(input: Exame): Promise<Exame>;
  findOne(input: FindExameInput): Promise<Exame | null>;
};
