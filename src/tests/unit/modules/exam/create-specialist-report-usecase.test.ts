import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import { CreateSpecialistReportUseCase } from '@/modules/exam/use-cases/create-specialist-report-usecase';

describe('CreateSpecialistReportUseCase', () => {
  const mockUsuariosRepository = {
    findBy: vi.fn(),
  };
  const mockExamesRepository = {
    findOne: vi.fn(),
  };
  const mockSpecialistReportRepository = {
    findByExamId: vi.fn(),
    create: vi.fn(),
  };
  const mockNotificationService = {
    notificar: vi.fn(),
  };
  const mockReportEditingPresenceService = {
    get: vi.fn(),
  };

  let sut: CreateSpecialistReportUseCase;

  const validRequest = {
    examId: 'exam-123',
    specialistId: 'spec-123',
    texto: 'Laudo detalhado',
    html: '<p>Laudo detalhado</p>',
    conteudo: { type: 'doc', content: [] },
    resultadoIaValido: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sut = new CreateSpecialistReportUseCase(
      mockUsuariosRepository as any,
      mockExamesRepository as any,
      mockSpecialistReportRepository as any,
      mockNotificationService as any,
      mockReportEditingPresenceService as any,
    );
  });

  it('deve criar um laudo de especialista com sucesso e enviar notificação', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });

    mockExamesRepository.findOne.mockResolvedValue({
      id: 'exam-123',
      idUsuario: 'paciente-456',
      status: 'CONCLUIDO',
    });

    mockSpecialistReportRepository.findByExamId.mockResolvedValue(null);
    mockReportEditingPresenceService.get.mockResolvedValue(null); // Ninguém editando

    const mockCreatedReport = {
      id: 'report-1',
      ...validRequest,
    };
    mockSpecialistReportRepository.create.mockResolvedValue(mockCreatedReport);

    const result = await sut.execute(validRequest);

    expect(result.created).toBe(true);
    expect(result.report).toEqual(mockCreatedReport);

    expect(mockSpecialistReportRepository.create).toHaveBeenCalledWith({
      examId: validRequest.examId,
      especialistId: validRequest.specialistId,
      texto: validRequest.texto,
      html: validRequest.html,
      conteudo: validRequest.conteudo,
      resultadoIaValido: validRequest.resultadoIaValido,
    });

    expect(mockNotificationService.notificar).toHaveBeenCalledWith({
      usuarioId: 'paciente-456',
      tipo: 'laudo_especialista_criado',
      titulo: 'Laudo de especialista disponível',
      mensagem: 'O laudo do especialista para o seu exame exam-123 está disponível.',
      chaveDedupe: 'laudo_especialista_criado_exam-123',
    });
  });

  it('deve permitir a criação se o próprio especialista for quem detém o lock de edição', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });
    mockExamesRepository.findOne.mockResolvedValue({
      id: 'exam-123',
      idUsuario: 'paciente-456',
      status: 'CONCLUIDO',
    });
    mockSpecialistReportRepository.findByExamId.mockResolvedValue(null);

    // O lock pertence ao especialista fazendo a requisição
    mockReportEditingPresenceService.get.mockResolvedValue({
      userId: 'spec-123',
      nome: 'Dr. Especialista',
    });
    mockSpecialistReportRepository.create.mockResolvedValue({ id: 'report-1' });

    const result = await sut.execute(validRequest);

    expect(result.created).toBe(true);
    expect(mockSpecialistReportRepository.create).toHaveBeenCalled();
  });

  it('deve lançar NotFoundError se o usuário não for encontrado', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue(null);

    await expect(sut.execute(validRequest)).rejects.toBeInstanceOf(NotFoundError);
    expect(mockSpecialistReportRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedError se o usuário não tiver o perfil ESPECIALISTA', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'med-123',
      tipoPerfil: 'MEDICO', // Perfil incorreto
    });

    await expect(sut.execute(validRequest)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('deve lançar NotFoundError se o exame não for encontrado', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });
    mockExamesRepository.findOne.mockResolvedValue(null);

    await expect(sut.execute(validRequest)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve lançar ConflictError se o exame não estiver com status CONCLUIDO', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });
    mockExamesRepository.findOne.mockResolvedValue({
      id: 'exam-123',
      status: 'PROCESSANDO', // Status inválido para laudar
    });

    await expect(sut.execute(validRequest)).rejects.toThrowError(ConflictError);
    await expect(sut.execute(validRequest)).rejects.toThrow(
      'Laudo do especialista só pode ser criado para exames concluídos',
    );
  });

  it('deve lançar ConflictError se já existir um laudo para o exame', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });
    mockExamesRepository.findOne.mockResolvedValue({
      id: 'exam-123',
      status: 'CONCLUIDO',
    });
    mockSpecialistReportRepository.findByExamId.mockResolvedValue({
      id: 'existing-report-1',
    }); // Laudo já existe

    await expect(sut.execute(validRequest)).rejects.toThrowError(ConflictError);
    await expect(sut.execute(validRequest)).rejects.toThrow(
      'Este exame já possui laudo do especialista',
    );
  });

  it('deve lançar ConflictError se outro especialista estiver editando o laudo', async () => {
    mockUsuariosRepository.findBy.mockResolvedValue({
      id: 'spec-123',
      tipoPerfil: 'ESPECIALISTA',
    });
    mockExamesRepository.findOne.mockResolvedValue({
      id: 'exam-123',
      status: 'CONCLUIDO',
    });
    mockSpecialistReportRepository.findByExamId.mockResolvedValue(null);

    // Outro usuário está com a sessão ativa
    mockReportEditingPresenceService.get.mockResolvedValue({
      userId: 'outro-spec-999',
      nome: 'Dr. Rafael',
    });

    await expect(sut.execute(validRequest)).rejects.toThrowError(ConflictError);
    await expect(sut.execute(validRequest)).rejects.toThrow(
      'O laudo deste exame está sendo editado por Dr. Rafael. Tente novamente mais tarde.',
    );
  });
});
