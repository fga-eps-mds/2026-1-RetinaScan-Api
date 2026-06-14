import type { ExamShare, CreateExamShareInput } from './exam-share';

export interface ExamShareRepository {
  create(input: CreateExamShareInput): Promise<ExamShare>;
  findById(id: string): Promise<ExamShare | null>;
  findByExamAndMedico(examId: string, medicoDestinoId: string): Promise<ExamShare | null>;
  listActiveByExam(examId: string): Promise<ExamShare[]>;
  revoke(id: string): Promise<void>;
}
