import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createExam } from '@/api/routes/exams/create-exam';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { Sexo } from '@/modules/exam';

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

describe('createExam controller', () => {
  const execute = vi.fn();

  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  // use any to satisfy FastifyReply generic status signature in tests
  let statusMock: any;
  let sendMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    sendMock = vi.fn().mockReturnThis();

    request = {
      user: { id: 'user-123' } as FastifyRequest['user'],
      body: {
        nomeCompleto: 'Fulano de Tal',
        cpf: '52998224725',
        sexo: Sexo.MASCULINO,
        dtNascimento: '1990-01-01',
        dtHora: '2026-05-18T10:00:00.000Z',
        comorbidades: {},
      },
    };

    reply = {
      status: statusMock,
      send: sendMock,
    };

    vi.mocked(container.resolve).mockReturnValue({
      execute,
    } as never);
  });

  it('should call use case with parsed data and return 201', async () => {
    const output = { id: 'exam-1' };
    execute.mockResolvedValue(output);

    await createExam(request as FastifyRequest, reply as FastifyReply);

    expect(container.resolve).toHaveBeenCalledWith('createExamUseCase');
    expect(execute).toHaveBeenCalledWith({
      idUsuario: 'user-123',
      nomeCompleto: 'Fulano de Tal',
      cpf: '52998224725',
      sexo: Sexo.MASCULINO,
      dtNascimento: '1990-01-01',
      dtHora: new Date('2026-05-18T10:00:00.000Z'),
      comorbidades: {
        diabetes: false,
        diabetesUsoInsulina: false,
        diabetesControlado: false,
        hipertensao: false,
        hipertensaoControlada: false,
        altaMiopia: false,
        glaucoma: false,
        usoHidroxicloroquina: false,
        uveite: false,
        catarata: false,
        outrasComorbidades: false,
        qualidadeTecnicaDificuldade: false,
      },
      descricao: undefined,
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith(output);
  });

  it('should throw ValidationError when cpf is invalid', async () => {
    request.body = {
      ...(request.body ?? {}),
      cpf: '12345678900',
    };

    await expect(
      createExam(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when diabetes is true and diabetesAnos is not provided', async () => {
    request.body = {
      ...(request.body ?? {}),
      comorbidades: {
        diabetes: true,
      },
    };

    await expect(
      createExam(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when outrasComorbidades is true and outrasComorbidadesDescricao is not provided', async () => {
    request.body = {
      ...(request.body ?? {}),
      comorbidades: {
        outrasComorbidades: true,
      },
    };

    await expect(
      createExam(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when body has extra fields', async () => {
    request.body = {
      ...(request.body ?? {}),
      campoInvalido: true,
    };

    await expect(
      createExam(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when comorbidades has extra fields', async () => {
    request.body = {
      ...(request.body ?? {}),
      comorbidades: {
        diabetes: false,
        campoInvalido: true,
      },
    };

    await expect(
      createExam(request as FastifyRequest, reply as FastifyReply),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
  });

  it('should accept outrasComorbidadesDescricao when outrasComorbidades is true', async () => {
    const output = { id: 'exam-2' };
    execute.mockResolvedValue(output);

    request.body = {
      ...(request.body ?? {}),
      comorbidades: {
        outrasComorbidades: true,
        outrasComorbidadesDescricao: 'Retinopatia prévia',
      },
    };

    await createExam(request as FastifyRequest, reply as FastifyReply);

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: 'user-123',
        comorbidades: expect.objectContaining({
          outrasComorbidades: true,
          outrasComorbidadesDescricao: 'Retinopatia prévia',
        }),
      }),
    );
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith(output);
  });

  it('should accept diabetesAnos when diabetes is true', async () => {
    const output = { id: 'exam-3' };
    execute.mockResolvedValue(output);

    request.body = {
      ...(request.body ?? {}),
      comorbidades: {
        diabetes: true,
        diabetesAnos: 12,
      },
    };

    await createExam(request as FastifyRequest, reply as FastifyReply);

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: 'user-123',
        comorbidades: expect.objectContaining({
          diabetes: true,
          diabetesAnos: 12,
        }),
      }),
    );
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith(output);
  });
});
