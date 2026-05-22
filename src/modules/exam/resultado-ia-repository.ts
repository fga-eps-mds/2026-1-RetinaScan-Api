import type { ResultadoIa } from './resultado-ia';

export type CreateResultadosIaInput = {
  resultados: ResultadoIa[];
};

export type ExistsResultadosIaByExamInput = {
  examId: string;
};

export type FindResultadosIaByExamInput = {
  examId: string;
};

export type ResultadoIaRepository = {
  createMany(input: CreateResultadosIaInput): Promise<void>;
  existsByExamId(input: ExistsResultadosIaByExamInput): Promise<boolean>;
  findByExamId(input: FindResultadosIaByExamInput): Promise<ResultadoIa[]>;
};
