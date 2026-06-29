export type ExamShare = {
  id: string;
  examId: string;
  medicoDestinoId: string;
  compartilhadoPor: string;
  ativo: boolean;
  expiraEm?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateExamShareInput = {
  examId: string;
  medicoDestinoId: string;
  compartilhadoPor: string;
  expiraEm?: Date | null;
};
