import type { Exame, ExameStatus, OlhoExame } from './exam';

export type FindExamInput = {
  examId: string;
};

export type FindManyExamsFilters = {
  idUsuario: string;
  cpf?: string;
  nomeCompleto?: string;
  status?: ExameStatus;
};

export type FindManyExamsPagination = {
  page: number;
  pageSize: number;
};

export type FindManyExamsInput = {
  filters: FindManyExamsFilters;
  pagination: FindManyExamsPagination;
};

export type ExameListItem = {
  id: string;
  nomeCompleto: string;
  olho: OlhoExame | null;
  status: ExameStatus;
  dtCriacao: Date;
};

export type FindManyExamsResult = {
  data: ExameListItem[];
  total: number;
};

export type UpdateExamData = Partial<{
  olho: OlhoExame | null;
  status: ExameStatus;
  comorbidades: string | null;
  descricao: string | null;
}>;

export type UpdateExamInput = {
  examId: string;
  data: UpdateExamData;
};

export type ExamesRepository = {
  create(input: Exame): Promise<Exame>;
  findOne(input: FindExamInput): Promise<Exame | null>;
  findMany(input: FindManyExamsInput): Promise<FindManyExamsResult>;
  update(input: UpdateExamInput): Promise<void>;
};
