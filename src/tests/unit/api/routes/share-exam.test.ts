import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { shareExam } from '@/api/routes/exams/share-exam';
import { ShareExamUseCase } from '@/modules/exam';
import { UnauthorizedError, ValidationError } from '@/shared/errors';

// Mock the dependencies
vi.mock('@/infra/database/drizzle/repositories', () => ({
  DrizzleExamesRepository: vi.fn(),
  DrizzleUsuariosRepository: vi.fn(),
  DrizzleExamShareRepository: vi.fn(),
}));

vi.mock('@/modules/exam', () => ({
  ShareExamUseCase: vi.fn(),
}));

describe('shareExam controller', () => {
  const execute = vi.fn();

  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  let statusMock: any;
  let sendMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    sendMock = vi.fn().mockReturnThis();

    request = {
      user: { id: 'user-123' } as FastifyRequest['user'],
      params: {
        examId: '11111111-1111-4111-8111-111111111111',
      },
      body: {
        emailDestino: 'medico@teste.com',
        expiraEm: '2026-12-31T15:00:00.000Z',
      },
    };

    reply = {
      status: statusMock,
      send: sendMock,
    };

    vi.mocked(ShareExamUseCase).mockImplementation(
      function () {
        return { execute };
      } as any
    );
  });

  it('deve chamar o use case com os dados do body e retornar 201', async () => {
    const output = {
      id: 'share-123',
      examId: '11111111-1111-4111-8111-111111111111',
      medicoDestinoId: 'medico-123',
      compartilhadoPor: 'user-123',
      expiraEm: new Date('2026-12-31T15:00:00.000Z'),
    };
    execute.mockResolvedValue(output);

    await shareExam(request as FastifyRequest, reply as FastifyReply);

    expect(ShareExamUseCase).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith({
      examId: '11111111-1111-4111-8111-111111111111',
      emailDestino: 'medico@teste.com',
      compartilhadoPorId: 'user-123',
      expiraEm: new Date('2026-12-31T15:00:00.000Z'),
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith({
      message: 'Exame compartilhado com sucesso.',
      data: {
        id: output.id,
        examId: output.examId,
        medicoDestinoId: output.medicoDestinoId,
        compartilhadoPor: output.compartilhadoPor,
        expiraEm: output.expiraEm.toISOString(),
      },
    });
  });

  it('deve permitir expiraEm nulo e retornar 201', async () => {
    request.body = {
      emailDestino: 'medico@teste.com',
    };

    const output = {
      id: 'share-123',
      examId: '11111111-1111-4111-8111-111111111111',
      medicoDestinoId: 'medico-123',
      compartilhadoPor: 'user-123',
      expiraEm: null,
    };
    execute.mockResolvedValue(output);

    await shareExam(request as FastifyRequest, reply as FastifyReply);

    expect(execute).toHaveBeenCalledWith({
      examId: '11111111-1111-4111-8111-111111111111',
      emailDestino: 'medico@teste.com',
      compartilhadoPorId: 'user-123',
      expiraEm: null,
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith({
      message: 'Exame compartilhado com sucesso.',
      data: {
        id: output.id,
        examId: output.examId,
        medicoDestinoId: output.medicoDestinoId,
        compartilhadoPor: output.compartilhadoPor,
        expiraEm: null,
      },
    });
  });

  it('deve lançar UnauthorizedError se usuário não estiver autenticado', async () => {
    request.user = undefined;

    await expect(shareExam(request as FastifyRequest, reply as FastifyReply)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError se o examId não for um UUID válido', async () => {
    request.params = {
      examId: 'id-invalido',
    };

    await expect(shareExam(request as FastifyRequest, reply as FastifyReply)).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError se o emailDestino não for um e-mail válido', async () => {
    request.body = {
      emailDestino: 'emailinvalido',
    };

    await expect(shareExam(request as FastifyRequest, reply as FastifyReply)).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError se a data expiraEm não for formato datetime', async () => {
    request.body = {
      emailDestino: 'medico@teste.com',
      expiraEm: '2026-10-10', // faltam os horários
    };

    await expect(shareExam(request as FastifyRequest, reply as FastifyReply)).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(execute).not.toHaveBeenCalled();
  });
});
