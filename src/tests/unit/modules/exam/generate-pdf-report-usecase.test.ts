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

  it('deve cobrir ramificações de imagens com Olho Esquerdo e sem IA, e comorbidades não controladas', async () => {
    const mockExamCompleto = {
      id: 'exam-2',
      nomeCompleto: 'Paciente Completo',
      cpf: '111.111.111-11',
      dtNascimento: '10/10/1980',
      status: 'CONCLUIDO',
      olho: 'OE',
      dtHora: new Date().toISOString(),
      medico: { nomeCompleto: 'Dr. Silva' },
      descricao: 'Descrição existente',
      laudoEspecialista: { texto: 'Laudo preenchido' },
      imagens: [
        {
          lateralidadeOlho: 'OE', // Força o ternário para "Esquerdo"
          url: 'http://localhost/image.png',
          resultadoIa: null // Força o bloco 'Resultado Indisponível'
        }
      ],
      comorbidades: {
        diabetes: true,
        diabetesControlado: false, // Força o texto sem o "(Controlado)"
        hipertensao: true,
        hipertensaoControlada: false, // Força o texto sem o "(Controlada)"
        altaMiopia: true,
        catarata: true,
        glaucoma: true,
        usoHidroxicloroquina: true
      }
    } as any;

    vi.spyOn(getExamDetailsUseCase, 'execute').mockResolvedValue(mockExamCompleto);
    vi.spyOn(pdfService, 'generateFromHtml').mockResolvedValue(Buffer.from('pdf-data'));

    const result = await useCase.execute({ examId: 'exam-2', requester: {} as any });
    expect(result).toBeInstanceOf(Buffer);
  });

  it('deve cobrir ramificações com Olho Direito, com IA ativa e comorbidades controladas', async () => {
    const mockExamAlternativo = {
      id: 'exam-3',
      nomeCompleto: '', // Testa o fallback para 'Não informado'
      cpf: '',
      dtNascimento: '',
      status: 'EM_ANDAMENTO',
      olho: '',
      dtHora: new Date().toISOString(),
      medico: { nomeCompleto: 'Dra. Maria' },
      descricao: '', // Testa o fallback 'Nenhuma nota médica registrada.'
      laudoEspecialista: null, // Testa o fallback 'Laudo estruturado ainda não preenchido.'
      imagens: [
        {
          lateralidadeOlho: 'OD', // Força o ternário para "Direito"
          url: 'http://localhost/image.png',
          resultadoIa: { predictedLabel: 'RETINOPATIA', confidence: 0.945 } // Cobre a renderização da IA
        }
      ],
      comorbidades: {
        diabetes: true,
        diabetesControlado: true, // Adiciona "(Controlado)"
        hipertensao: true,
        hipertensaoControlada: true, // Adiciona "(Controlada)"
        altaMiopia: false,
        catarata: false,
        glaucoma: false,
        usoHidroxicloroquina: false
      }
    } as any;

    vi.spyOn(getExamDetailsUseCase, 'execute').mockResolvedValue(mockExamAlternativo);
    vi.spyOn(pdfService, 'generateFromHtml').mockResolvedValue(Buffer.from('pdf-data'));

    const result = await useCase.execute({ examId: 'exam-3', requester: {} as any });
    expect(result).toBeInstanceOf(Buffer);
  });
});