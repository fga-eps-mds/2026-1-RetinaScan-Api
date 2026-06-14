import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratePdfReportUseCase } from '@/modules/exam/use-cases/generate-pdf-report-usecase';
import type { GetExamDetailsUseCase } from '@/modules/exam/use-cases/get-exam-details-usecase';
import type { PdfService } from '@/shared/services/pdf-service';

describe('GeneratePdfReportUseCase (Unit)', () => {
  let useCase: GeneratePdfReportUseCase;
  let getExamDetailsUseCase: GetExamDetailsUseCase;
  let pdfService: PdfService;

  beforeEach(() => {
    getExamDetailsUseCase = { execute: vi.fn() } as any;
    pdfService = { generateFromHtml: vi.fn() } as any;
    useCase = new GeneratePdfReportUseCase(getExamDetailsUseCase, pdfService);
  });

  it('deve gerar o PDF com sucesso quando os dados do exame são buscados', async () => {
    const mockExam = {
      id: 'exam-1',
      nomeCompleto: 'Paciente',
      status: 'CONCLUIDO',
      olho: 'OD',
      dtHora: new Date().toISOString(),
      imagens: [],
      medico: { nomeCompleto: 'Dr. Teste' },
      comorbidades: null,
      descricao: 'Prontuário de teste',
      laudoEspecialista: { texto: 'Laudo de teste' }
    } as any;

    vi.spyOn(getExamDetailsUseCase, 'execute').mockResolvedValue(mockExam);
    vi.spyOn(pdfService, 'generateFromHtml').mockResolvedValue(Buffer.from('pdf-data'));

    const result = await useCase.execute({ examId: 'exam-1', requester: {} as any });

    expect(result).toBeInstanceOf(Buffer);
    expect(pdfService.generateFromHtml).toHaveBeenCalled();
  });
});