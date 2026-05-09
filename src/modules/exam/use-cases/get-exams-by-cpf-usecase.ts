import type { ExamesRepository } from '@/modules/exam';
import type { Exame } from '@/modules/exam/exam';

export type GetExamsByCpfUseCaseInput = {
  cpf: string;
};

export type GetExamsByCpfUseCaseOutput = Exame[];

export class GetExamsByCpfUseCase {
  constructor(private readonly examRepository: ExamesRepository) {}

  async execute(input: GetExamsByCpfUseCaseInput): Promise<GetExamsByCpfUseCaseOutput> {
    return this.examRepository.findByCpf(input);
  }
}