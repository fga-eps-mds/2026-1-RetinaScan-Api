import type {
  ExamesRepository,
  ExamVolumeMetrics,
  MetricsDateFilter,
} from '@/modules/exam/exam-repository';
import type {
  DiagnosisMetrics,
  ResultadoIaRepository,
} from '@/modules/exam/resultado-ia-repository';

export type GetExamMetricsUseCaseInput = MetricsDateFilter;

export type GetExamMetricsUseCaseOutput = {
  volume: ExamVolumeMetrics;
  resultadosIa: DiagnosisMetrics;
};

export class GetExamMetricsUseCase {
  constructor(
    private readonly examesRepository: ExamesRepository,
    private readonly resultadoIaRepository: ResultadoIaRepository,
  ) {}

  /**
   * Agrega as métricas de exames (volume) e de diagnósticos de IA no período informado,
   * consultando os dois repositórios em paralelo.
   */
  async execute(input: GetExamMetricsUseCaseInput): Promise<GetExamMetricsUseCaseOutput> {
    const [volume, resultadosIa] = await Promise.all([
      this.examesRepository.getVolumeMetrics(input),
      this.resultadoIaRepository.getDiagnosisMetrics(input),
    ]);

    return { volume, resultadosIa };
  }
}
