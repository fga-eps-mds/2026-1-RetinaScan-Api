import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ExamVolumeMetrics,
  ExamesRepository,
} from '@/modules/exam/exam-repository';
import type {
  DiagnosisMetrics,
  ResultadoIaRepository,
} from '@/modules/exam/resultado-ia-repository';
import { GetExamMetricsUseCase } from '@/modules/exam/use-cases/get-exam-metrics-usecase';

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  createWithComorbidity = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
  getVolumeMetrics = vi.fn();
}

class FakeResultadoIaRepository implements ResultadoIaRepository {
  createMany = vi.fn();
  existsByExamId = vi.fn();
  findByExamId = vi.fn();
  getDiagnosisMetrics = vi.fn();
}

const volume: ExamVolumeMetrics = {
  total: 3,
  porStatus: { CRIADO: 1, CONCLUIDO: 2, EM_PROCESSAMENTO: 0, ERRO_PROCESSAMENTO: 0 },
  serieTemporal: [{ data: '2026-06-01', total: 3 }],
};

const resultadosIa: DiagnosisMetrics = {
  totalResultados: 4,
  porDiagnostico: [{ label: 'normal', total: 3 }, { label: 'abnormal', total: 1 }],
  confiancaMedia: 0.85,
};

let examesRepository: FakeExamesRepository;
let resultadoIaRepository: FakeResultadoIaRepository;
let usecase: GetExamMetricsUseCase;

describe('GetExamMetricsUseCase', () => {
  beforeEach(() => {
    examesRepository = new FakeExamesRepository();
    resultadoIaRepository = new FakeResultadoIaRepository();
    usecase = new GetExamMetricsUseCase(examesRepository, resultadoIaRepository);
    vi.clearAllMocks();
  });

  it('should combine volume and IA metrics into a single output', async () => {
    examesRepository.getVolumeMetrics.mockResolvedValue(volume);
    resultadoIaRepository.getDiagnosisMetrics.mockResolvedValue(resultadosIa);

    const result = await usecase.execute({});

    expect(result).toEqual({ volume, resultadosIa });
  });

  it('should forward the date filter to both repositories', async () => {
    examesRepository.getVolumeMetrics.mockResolvedValue(volume);
    resultadoIaRepository.getDiagnosisMetrics.mockResolvedValue(resultadosIa);

    const input = {
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T23:59:59.999Z'),
    };

    await usecase.execute(input);

    expect(examesRepository.getVolumeMetrics).toHaveBeenCalledWith(input);
    expect(resultadoIaRepository.getDiagnosisMetrics).toHaveBeenCalledWith(input);
  });

  it('should pass through empty aggregates', async () => {
    examesRepository.getVolumeMetrics.mockResolvedValue({
      total: 0,
      porStatus: { CRIADO: 0, CONCLUIDO: 0, EM_PROCESSAMENTO: 0, ERRO_PROCESSAMENTO: 0 },
      serieTemporal: [],
    });
    resultadoIaRepository.getDiagnosisMetrics.mockResolvedValue({
      totalResultados: 0,
      porDiagnostico: [],
      confiancaMedia: 0,
    });

    const result = await usecase.execute({});

    expect(result.volume.total).toBe(0);
    expect(result.resultadosIa.confiancaMedia).toBe(0);
    expect(result.resultadosIa.porDiagnostico).toEqual([]);
  });
});
