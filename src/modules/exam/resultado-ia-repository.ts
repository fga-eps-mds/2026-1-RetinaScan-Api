import type { MetricsDateFilter } from './exam-repository';
import type { ResultadoIa } from './resultado-ia';

export type DiagnosisLabelCount = {
  label: string;
  total: number;
};

export type DiagnosisMetrics = {
  totalResultados: number;
  porDiagnostico: DiagnosisLabelCount[];
  confiancaMedia: number;
};

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
  getDiagnosisMetrics(input: MetricsDateFilter): Promise<DiagnosisMetrics>;
};
