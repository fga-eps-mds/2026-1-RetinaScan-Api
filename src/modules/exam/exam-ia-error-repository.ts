import type { ExamIaError } from './exam-ia-error';

export type CreateExamIaErrorInput = {
  erro: ExamIaError;
};

export type ExistsExamIaErrorByExamInput = {
  examId: string;
};

export type ExamIaErrorRepository = {
  create(input: CreateExamIaErrorInput): Promise<void>;
  existsByExamId(input: ExistsExamIaErrorByExamInput): Promise<boolean>;
};
