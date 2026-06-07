import type { SpecialistReport } from './specialist-report';

export type CreateSpecialistReportInput = {
  examId: string;
  especialistId: string;
  texto: string;
  resultadoIAValido: boolean;
};

export type UpdateSpecialistReportInput = {
  texto: string;
  resultadoIAValido: boolean;
};

export interface SpecialistReportRepository {
  findByExamId(examId: string): Promise<SpecialistReport | null>;
  create(data: CreateSpecialistReportInput): Promise<SpecialistReport>;
  update(examId: string, data: UpdateSpecialistReportInput): Promise<SpecialistReport>;
}
