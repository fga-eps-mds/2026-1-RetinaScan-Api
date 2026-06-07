import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import { CreateSpecialistReportUseCase } from '@/modules/exam/use-cases/create-specialist-report-usecase';

describe('CreateSpecialistReportUseCase', () => {
  let usuariosRepository: {
    findBy: ReturnType<typeof vi.fn>;
  };

  let examesRepository: {
    findOne: ReturnType<typeof vi.fn>;
  };

  let specialistReportRepository: {
    findByExamId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let notificationService: {
    notificar: ReturnType<typeof vi.fn>;
  };

  let reportEditingPresenceService: {
    get: ReturnType<typeof vi.fn>;
  };

  let sut: CreateSpecialistReportUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    usuariosRepository = {
      findBy: vi.fn(),
    };

    examesRepository = {
      findOne: vi.fn(),
    };

    specialistReportRepository = {
      findByExamId: vi.fn(),
      create: vi.fn(),
    };

    notificationService = {
      notificar: vi.fn(),
    };

    reportEditingPresenceService = {
      get: vi.fn(),
    };

    sut = new CreateSpecialistReportUseCase(
      usuariosRepository as any,
      examesRepository as any,
      specialistReportRepository as any,
      notificationService as any,
      reportEditingPresenceService as any,
    );
  });

  it('deve lançar NotFoundError quando o usuário não for encontrado', async () => {
    usuariosRepository.findBy.mockResolvedValue(null);

    const promise = sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo gerado',
      resultadoIAValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toThrow('Usuário não encontrado');

    expect(examesRepository.findOne).not.toHaveBeenCalled();
    expect(specialistReportRepository.findByExamId).not.toHaveBeenCalled();
    expect(reportEditingPresenceService.get).not.toHaveBeenCalled();
    expect(specialistReportRepository.create).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedError quando o usuário não for especialista', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ADMIN',
    });

    const promise = sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo gerado',
      resultadoIAValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toThrow('Usuário não é um especialista');

    expect(examesRepository.findOne).not.toHaveBeenCalled();
    expect(specialistReportRepository.findByExamId).not.toHaveBeenCalled();
    expect(reportEditingPresenceService.get).not.toHaveBeenCalled();
    expect(specialistReportRepository.create).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundError quando o exame não for encontrado', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });

    examesRepository.findOne.mockResolvedValue(null);

    const promise = sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo gerado',
      resultadoIAValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toThrow('Exame não encontrado');

    expect(specialistReportRepository.findByExamId).not.toHaveBeenCalled();
    expect(reportEditingPresenceService.get).not.toHaveBeenCalled();
    expect(specialistReportRepository.create).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar ConflictError quando o exame já possuir laudo do especialista', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });

    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      idUsuario: 'user-1',
    });

    specialistReportRepository.findByExamId.mockResolvedValue({
      id: 'report-1',
      examId: 'exam-1',
    });

    const promise = sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo gerado',
      resultadoIAValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(ConflictError);
    await expect(promise).rejects.toThrow('Este exame já possui laudo do especialista');

    expect(reportEditingPresenceService.get).not.toHaveBeenCalled();
    expect(specialistReportRepository.create).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar ConflictError quando houver edição em andamento', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });

    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      idUsuario: 'user-1',
    });

    specialistReportRepository.findByExamId.mockResolvedValue(null);

    reportEditingPresenceService.get.mockResolvedValue({
      examId: 'exam-1',
      userId: 'specialist-2',
      nome: 'Dr. João',
      socketId: 'socket-1',
      pageSessionId: 'page-1',
      startedAt: '2026-06-07T03:00:00.000Z',
      expiresAt: '2026-06-07T03:05:00.000Z',
    });

    const promise = sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo gerado',
      resultadoIAValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(ConflictError);
    await expect(promise).rejects.toThrow(
      'O laudo deste exame está sendo editado por Dr. João. Tente novamente mais tarde.',
    );

    expect(specialistReportRepository.create).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve criar o laudo e notificar o usuário quando não houver conflitos', async () => {
    const actor = {
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    };

    const examDetails = {
      id: 'exam-db-1',
      examId: 'exam-1',
      idUsuario: 'user-1',
    };

    const createdReport = {
      id: 'report-1',
      examId: 'exam-1',
      especialistId: 'specialist-1',
      texto: 'Laudo final',
      resultadoIAValido: true,
    };

    usuariosRepository.findBy.mockResolvedValue(actor);
    examesRepository.findOne.mockResolvedValue(examDetails);
    specialistReportRepository.findByExamId.mockResolvedValue(null);
    reportEditingPresenceService.get.mockResolvedValue(null);
    specialistReportRepository.create.mockResolvedValue(createdReport);
    notificationService.notificar.mockResolvedValue(undefined);

    const result = await sut.execute({
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo final',
      resultadoIAValido: true,
    });

    expect(usuariosRepository.findBy).toHaveBeenCalledWith({
      id: 'specialist-1',
    });

    expect(examesRepository.findOne).toHaveBeenCalledWith({
      examId: 'exam-1',
    });

    expect(specialistReportRepository.findByExamId).toHaveBeenCalledWith('exam-1');
    expect(reportEditingPresenceService.get).toHaveBeenCalledWith('exam-1');

    expect(specialistReportRepository.create).toHaveBeenCalledWith({
      examId: 'exam-1',
      especialistId: 'specialist-1',
      texto: 'Laudo final',
      resultadoIAValido: true,
    });

    expect(notificationService.notificar).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      tipo: 'laudo_especialista_criado',
      titulo: 'Laudo de especialista disponível',
      mensagem: 'O laudo do especialista para o seu exame está disponível.',
      chaveDedupe: 'laudo_especialista_criado_exam-db-1',
    });

    expect(result).toEqual({
      report: createdReport,
      created: true,
    });
  });
});
