import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '@/shared/errors';
import { createSpecialistReport } from '@/api/routes/report/create-specialist-report';
import { updateSpecialistReport } from '@/api/routes/report/update-specialist-report';
import { auth } from '@/lib/auth';
import { container } from '@/infra/container';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/infra/container', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

const makeReply = () => {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };

  return reply as any;
};

const validBody = {
  texto: 'Laudo do especialista',
  resultadoIaValido: true,
  html: '<p>Laudo do especialista</p>',
  json: {
    type: 'doc',
    content: [],
  },
};

describe('createSpecialistReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar relatório para especialista', async () => {
    const execute = vi.fn().mockResolvedValue({
      report: {
        id: 'report-1',
        examId: 'exam-1',
      },
      created: true,
    });

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'specialist-1',
        tipoPerfil: 'ESPECIALISTA',
      },
    } as any);

    vi.mocked(container.resolve).mockReturnValue({
      execute,
    } as any);

    const request = {
      params: {
        examId: '550e8400-e29b-41d4-a716-446655440000',
      },
      body: validBody,
      headers: {},
    } as any;

    const reply = makeReply();

    await createSpecialistReport(request, reply);

    expect(container.resolve).toHaveBeenCalledWith('createSpecialistReportUseCase');

    expect(execute).toHaveBeenCalledWith({
      specialistId: 'specialist-1', // <-- CORRIGIDO AQUI: de actorId para specialistId
      examId: '550e8400-e29b-41d4-a716-446655440000',
      texto: 'Laudo do especialista',
      resultadoIaValido: true,
      html: '<p>Laudo do especialista</p>',
      conteudo: {
        type: 'doc',
        content: [],
      },
    });

    expect(reply.status).toHaveBeenCalledWith(201);
  });

  it('deve lançar UnauthorizedError quando usuário não for especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'medico-1',
        tipoPerfil: 'MEDICO',
      },
    } as any);

    const request = {
      params: {
        examId: '550e8400-e29b-41d4-a716-446655440000',
      },
      body: validBody,
      headers: {},
    } as any;

    const reply = makeReply();

    await expect(createSpecialistReport(request, reply)).rejects.toBeInstanceOf(UnauthorizedError);

    expect(container.resolve).not.toHaveBeenCalled();
  });
});

describe('updateSpecialistReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve atualizar relatório para especialista', async () => {
    const execute = vi.fn().mockResolvedValue({
      report: {
        id: 'report-1',
        examId: 'exam-1',
      },
      updated: true,
    });

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'specialist-1',
        tipoPerfil: 'ESPECIALISTA',
      },
    } as any);

    vi.mocked(container.resolve).mockReturnValue({
      execute,
    } as any);

    const request = {
      params: {
        examId: '550e8400-e29b-41d4-a716-446655440000',
      },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: false,
        html: '<p>Laudo atualizado</p>',
        json: {
          type: 'doc',
          content: [],
        },
      },
      headers: {},
    } as any;

    const reply = makeReply();

    await updateSpecialistReport(request, reply);

    expect(container.resolve).toHaveBeenCalledWith('updateSpecialistReportUseCase');

    expect(execute).toHaveBeenCalledWith({
      actorId: 'specialist-1', // O update usa actorId, então aqui continua assim
      examId: '550e8400-e29b-41d4-a716-446655440000',
      texto: 'Laudo atualizado',
      resultadoIaValido: false,
      html: '<p>Laudo atualizado</p>',
      conteudo: {
        type: 'doc',
        content: [],
      },
    });

    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('deve lançar UnauthorizedError quando usuário não for especialista', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'medico-1',
        tipoPerfil: 'MEDICO',
      },
    } as any);

    const request = {
      params: {
        examId: '550e8400-e29b-41d4-a716-446655440000',
      },
      body: {
        texto: 'Laudo atualizado',
        resultadoIaValido: true,
        html: '<p>Laudo atualizado</p>',
        json: {
          type: 'doc',
          content: [],
        },
      },
      headers: {},
    } as any;

    const reply = makeReply();

    await expect(updateSpecialistReport(request, reply)).rejects.toBeInstanceOf(UnauthorizedError);

    expect(container.resolve).not.toHaveBeenCalled();
  });
});
