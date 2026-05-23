import type { Comorbidade } from './exam';

export type FindComorbidadeByExamInput = {
  examId: string;
};

export type ComorbidadeRepository = {
  findByExamId(input: FindComorbidadeByExamInput): Promise<Comorbidade | null>;
};
