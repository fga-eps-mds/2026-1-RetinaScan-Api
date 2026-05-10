import type {
  ExameListItem,
  ExamesRepository,
  FindManyExamsFilters,
} from '@/modules/exam/exam-repository';

export type ListExamsUseCaseInput = {
  filters: FindManyExamsFilters;
  pagination: {
    page: number;
    pageSize: number;
  };
};

export type ListExamsUseCaseOutput = {
  data: ExameListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export class ListExamsUseCase {
  constructor(private readonly examRepository: ExamesRepository) {}

  async execute(input: ListExamsUseCaseInput): Promise<ListExamsUseCaseOutput> {
    const { filters, pagination } = input;

    const { data, total } = await this.examRepository.findMany({
      filters,
      pagination,
    });

    return {
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0,
      },
    };
  }
}
