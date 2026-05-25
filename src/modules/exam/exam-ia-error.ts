export type ExamIaErrorArgs = Record<string, unknown>;

export type ExamIaError = {
  id: string;
  idExame: string;
  errorMessage: string;
  traceback?: string | null;
  taskId?: string | null;
  taskName?: string | null;
  args?: ExamIaErrorArgs | null;
  dtHora: Date;
};
