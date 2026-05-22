import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ExamIaErrorRepository } from '@/modules/exam/exam-ia-error-repository';
import { ExameStatus } from '@/modules/exam/exam';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import {
  RegisterExamAiErrorUseCase,
  type RegisterExamAiErrorUseCaseInput,
} from '@/modules/exam/use-cases/register-exam-ai-error-usecase';

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
}

class FakeExamIaErrorRepository implements ExamIaErrorRepository {
  create = vi.fn();
  existsByExamId = vi.fn();
}

let examRepository: FakeExamesRepository;
let examIaErrorRepository: FakeExamIaErrorRepository;
let usecase: RegisterExamAiErrorUseCase;

const buildInput = (
  overrides: Partial<RegisterExamAiErrorUseCaseInput> = {},
): RegisterExamAiErrorUseCaseInput => {
  const examId = faker.string.uuid();
  return {
    examId,
    payloadExamId: examId,
    errorMessage: "TimeoutError('Connection timed out')",
    traceback: 'Traceback (most recent call last):...',
    taskId: '8f2f4b6e-9b8a-4d6c-a4c2-8d6d7a9d1234',
    taskName: 'process_exam_task',
    args: { exam_id: '123456', priority: 'high' },
    ...overrides,
  };
};

describe('RegisterExamAiErrorUseCase', () => {
  beforeEach(() => {
    examRepository = new FakeExamesRepository();
    examIaErrorRepository = new FakeExamIaErrorRepository();
    usecase = new RegisterExamAiErrorUseCase(examRepository, examIaErrorRepository);
    vi.clearAllMocks();
  });

  it('should persist error and mark exam as ERRO_PROCESSAMENTO on happy path', async () => {
    const exame = ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).getData();
    examRepository.findOne.mockResolvedValue(exame);
    examIaErrorRepository.existsByExamId.mockResolvedValue(false);
    examIaErrorRepository.create.mockResolvedValue(undefined);
    examRepository.update.mockResolvedValue(undefined);

    const input = buildInput({ examId: exame.id, payloadExamId: exame.id });
    await usecase.execute(input);

    expect(examIaErrorRepository.create).toHaveBeenCalledTimes(1);
    const [createArg] = examIaErrorRepository.create.mock.calls[0];
    expect(createArg.erro).toEqual(
      expect.objectContaining({
        idExame: exame.id,
        errorMessage: input.errorMessage,
        traceback: input.traceback,
        taskId: input.taskId,
        taskName: input.taskName,
        args: input.args,
      }),
    );
    expect(createArg.erro.id).toEqual(expect.any(String));
    expect(createArg.erro.dtHora).toBeInstanceOf(Date);

    expect(examRepository.update).toHaveBeenCalledWith({
      examId: exame.id,
      data: { status: ExameStatus.ERRO_PROCESSAMENTO },
    });
  });

  it('should persist error with optional fields as null when omitted', async () => {
    const exame = ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).getData();
    examRepository.findOne.mockResolvedValue(exame);
    examIaErrorRepository.existsByExamId.mockResolvedValue(false);

    await usecase.execute({
      examId: exame.id,
      payloadExamId: exame.id,
      errorMessage: 'boom',
    });

    const [createArg] = examIaErrorRepository.create.mock.calls[0];
    expect(createArg.erro.traceback).toBeNull();
    expect(createArg.erro.taskId).toBeNull();
    expect(createArg.erro.taskName).toBeNull();
    expect(createArg.erro.args).toBeNull();
  });

  it('should throw ValidationError when payloadExamId differs from examId', async () => {
    await expect(
      usecase.execute(buildInput({ payloadExamId: faker.string.uuid() })),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(examRepository.findOne).not.toHaveBeenCalled();
    expect(examIaErrorRepository.create).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when exam does not exist', async () => {
    examRepository.findOne.mockResolvedValue(null);

    await expect(usecase.execute(buildInput())).rejects.toBeInstanceOf(NotFoundError);

    expect(examIaErrorRepository.create).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when exam is already CONCLUIDO', async () => {
    const exame = ExameBuilder.anExame().withStatus(ExameStatus.CONCLUIDO).getData();
    examRepository.findOne.mockResolvedValue(exame);

    await expect(
      usecase.execute(buildInput({ examId: exame.id, payloadExamId: exame.id })),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(examIaErrorRepository.existsByExamId).not.toHaveBeenCalled();
    expect(examIaErrorRepository.create).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when exam already has an error registered', async () => {
    const exame = ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).getData();
    examRepository.findOne.mockResolvedValue(exame);
    examIaErrorRepository.existsByExamId.mockResolvedValue(true);

    await expect(
      usecase.execute(buildInput({ examId: exame.id, payloadExamId: exame.id })),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(examIaErrorRepository.create).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should propagate create failure and not update exam status', async () => {
    const exame = ExameBuilder.anExame().withStatus(ExameStatus.EM_PROCESSAMENTO).getData();
    examRepository.findOne.mockResolvedValue(exame);
    examIaErrorRepository.existsByExamId.mockResolvedValue(false);
    const dbError = new Error('db down');
    examIaErrorRepository.create.mockRejectedValue(dbError);

    await expect(
      usecase.execute(buildInput({ examId: exame.id, payloadExamId: exame.id })),
    ).rejects.toBe(dbError);

    expect(examRepository.update).not.toHaveBeenCalled();
  });
});
