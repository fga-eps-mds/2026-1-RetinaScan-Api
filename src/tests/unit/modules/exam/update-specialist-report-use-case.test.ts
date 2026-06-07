import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';
import { env } from '@/env';
import { UpdateSpecialistReportUseCase } from '@/modules/exam/use-cases/update-specialist-report-usecase';

describe('UpdateSpecialistReportUseCase', () => {
  let usuariosRepository: {
    findBy: ReturnType<typeof vi.fn>;
  };

  let examesRepository: {
    findOne: ReturnType<typeof vi.fn>;
  };

  let specialistReportRepository: {
    findByExamId: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  let notificationService: {
    notificar: ReturnType<typeof vi.fn>;
  };

  let sut: UpdateSpecialistReportUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T03:00:00.000Z'));

    usuariosRepository = {
      findBy: vi.fn(),
    };

    examesRepository = {
      findOne: vi.fn(),
    };

    specialistReportRepository = {
      findByExamId: vi.fn(),
      update: vi.fn(),
    };

    notificationService = {
      notificar: vi.fn(),
    };

    sut = new UpdateSpecialistReportUseCase(
      usuariosRepository as any,
      examesRepository as any,
      specialistReportRepository as any,
      notificationService as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve lançar NotFoundError quando o usuário não for encontrado', async () => {
    usuariosRepository.findBy.mockResolvedValue(null);

    const promise = sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toThrow('Usuário não encontrado');

    expect(examesRepository.findOne).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundError quando o exame não for encontrado', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });
    examesRepository.findOne.mockResolvedValue(null);

    const promise = sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toThrow('Exame não encontrado');

    expect(specialistReportRepository.findByExamId).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundError quando o laudo do especialista não existir', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });
    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      idUsuario: 'user-1',
      nomeCompleto: 'Paciente Teste',
    });
    specialistReportRepository.findByExamId.mockResolvedValue(null);

    const promise = sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toThrow('Laudo do especialista não encontrado para este exame');

    expect(specialistReportRepository.update).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedError quando o ator tentar atualizar laudo de outro especialista', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });
    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      idUsuario: 'user-1',
      nomeCompleto: 'Paciente Teste',
    });
    specialistReportRepository.findByExamId.mockResolvedValue({
      id: 'report-1',
      examId: 'exam-1',
      specialistId: 'specialist-2',
      createdAt: '2026-06-07T02:00:00.000Z',
    });

    const promise = sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toThrow('Você não pode atualizar o laudo de outro especialista');

    expect(specialistReportRepository.update).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedError quando o prazo de edição tiver expirado', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });
    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      idUsuario: 'user-1',
      nomeCompleto: 'Paciente Teste',
    });

    const createdAt = new Date('2026-06-01T00:00:00.000Z');
    const expiredCreatedAt = new Date(createdAt);
    expiredCreatedAt.setHours(
      expiredCreatedAt.getHours() - Number(env.SPECIALIST_REPORT_EDIT_WINDOW_DAYS) - 1,
    );

    specialistReportRepository.findByExamId.mockResolvedValue({
      id: 'report-1',
      examId: 'exam-1',
      specialistId: 'specialist-1',
      createdAt: expiredCreatedAt.toISOString(),
    });

    const promise = sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: false,
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toThrow('O prazo para editar este laudo expirou');

    expect(specialistReportRepository.update).not.toHaveBeenCalled();
    expect(notificationService.notificar).not.toHaveBeenCalled();
  });

  it('deve atualizar o laudo e notificar o usuário quando estiver dentro do prazo', async () => {
    usuariosRepository.findBy.mockResolvedValue({
      id: 'specialist-1',
      tipoPerfil: 'ESPECIALISTA',
    });

    examesRepository.findOne.mockResolvedValue({
      id: 'exam-db-1',
      examId: 'exam-1',
      idUsuario: 'user-1',
      nomeCompleto: 'Maria da Silva',
    });

    specialistReportRepository.findByExamId.mockResolvedValue({
      id: 'report-1',
      examId: 'exam-1',
      specialistId: 'specialist-1',
      createdAt: '2026-06-07T02:30:00.000Z',
    });

    const updatedReport = {
      id: 'report-1',
      examId: 'exam-1',
      specialistId: 'specialist-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    };

    specialistReportRepository.update.mockResolvedValue(updatedReport);
    notificationService.notificar.mockResolvedValue(undefined);

    const result = await sut.execute({
      actorId: 'specialist-1',
      examId: 'exam-1',
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    expect(usuariosRepository.findBy).toHaveBeenCalledWith({
      id: 'specialist-1',
    });

    expect(examesRepository.findOne).toHaveBeenCalledWith({
      examId: 'exam-1',
    });

    expect(specialistReportRepository.findByExamId).toHaveBeenCalledWith('exam-1');

    expect(specialistReportRepository.update).toHaveBeenCalledWith('report-1', {
      texto: 'Laudo atualizado',
      resultadoIaValido: true,
    });

    expect(notificationService.notificar).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      tipo: 'laudo_especialista_atualizado',
      titulo: 'Laudo de especialista atualizado',
      mensagem: 'O laudo do especialista para o seu exame "Maria da Silva" foi atualizado.',
      chaveDedupe: 'laudo_atualizado_exam-db-1',
    });

    expect(result).toEqual({
      report: updatedReport,
      updated: true,
    });
  });
});
