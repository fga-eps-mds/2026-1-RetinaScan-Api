import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { createSpecialistReport } from '@/api/routes/report/create-specialist-report';
import { updateSpecialistReport } from '@/api/routes/report/update-specialist-report';
import { container } from '@/infra/container';
import { auth } from '@/lib/auth';
import { tiposPerfil } from '@/modules/users/domain';
import { UnauthorizedError, ValidationError } from '@/shared/errors';

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

function makeReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  } as unknown as FastifyReply & {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);

  return reply;
}

const validExamId = '11111111-1111-1111-1111-111111111111';

describe('createSpecialistReport', () => {
  const useCaseMock = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(useCaseMock);
  });

  it('deve criar relatório para especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'specialist-1',
        tipoPerfil: tiposPerfil.ESPECIALISTA,
      },
    } as never);

    useCaseMock.execute.mockResolvedValueOnce({
      id: 'report-1',
      examId: validExamId,
    });

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo final',
        resultadoIaValido: true,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await createSpecialistReport(request, reply);

    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: request.headers,
    });

    expect(container.resolve).toHaveBeenCalledWith('createSpecialistReportUseCase');

    expect(useCaseMock.execute).toHaveBeenCalledWith({
      examId: validExamId,
      specialistId: 'specialist-1',
      texto: 'Laudo final',
      resultadoIaValido: true,
    });

    expect(reply.status).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({
      id: 'report-1',
      examId: validExamId,
    });
  });

  it('deve lançar UnauthorizedError quando usuário não for especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        tipoPerfil: 'ADMIN',
      },
    } as never);

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo final',
        resultadoIaValido: true,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(createSpecialistReport(request, reply)).rejects.toBeInstanceOf(UnauthorizedError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com params inválidos', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'specialist-1',
        tipoPerfil: tiposPerfil.ESPECIALISTA,
      },
    } as never);

    const request = {
      headers: {},
      params: { examId: 'abc' },
      body: {
        texto: 'Laudo final',
        resultadoIaValido: true,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(createSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com body inválido', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'specialist-1',
        tipoPerfil: tiposPerfil.ESPECIALISTA,
      },
    } as never);

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: '',
        resultadoIaValido: true,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(createSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com campo extra no body', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'specialist-1',
        tipoPerfil: tiposPerfil.ESPECIALISTA,
      },
    } as never);

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo final',
        resultadoIaValido: true,
        campoExtra: 'x',
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(createSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('updateSpecialistReport', () => {
  const useCaseMock = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(useCaseMock);
  });

  it('deve atualizar relatório para especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'specialist-1',
        tipoPerfil: tiposPerfil.ESPECIALISTA,
      },
    } as never);

    useCaseMock.execute.mockResolvedValueOnce({
      id: 'report-1',
      updated: true,
    });

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: false,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await updateSpecialistReport(request, reply);

    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: request.headers,
    });

    expect(container.resolve).toHaveBeenCalledWith('updateSpecialistReportUseCase');

    expect(useCaseMock.execute).toHaveBeenCalledWith({
      actorId: 'specialist-1',
      examId: validExamId,
      texto: 'Laudo atualizado',
      resultadoIaValido: false,
    });

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      id: 'report-1',
      updated: true,
    });
  });

  it('deve lançar UnauthorizedError quando usuário não for especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        tipoPerfil: 'ADMIN',
      },
    } as never);

    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: false,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(UnauthorizedError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com params inválidos', async () => {
    const request = {
      headers: {},
      params: { examId: 'abc' },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: false,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com body inválido quando texto estiver vazio', async () => {
    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: '',
        resultadoIaValido: false,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com body inválido quando nome do campo boolean estiver errado', async () => {
    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo atualizado',
        resultadoIAValido: false,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('deve lançar ValidationError com campo extra no body por causa do strict', async () => {
    const request = {
      headers: {},
      params: { examId: validExamId },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: false,
        extra: true,
      },
    } as unknown as FastifyRequest;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });
});
