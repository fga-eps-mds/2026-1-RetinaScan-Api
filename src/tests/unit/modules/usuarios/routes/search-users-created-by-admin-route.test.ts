import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMedicosByAdmin } from '@/api/routes/users/seach-users-created-by-admin';
import { SearchDoctorsUseCase } from '@/modules/users/use-cases/search-users-created-by-admin';

vi.mock('@/modules/users/use-cases/search-users-created-by-admin');
vi.mock('@/infra/database/drizzle/repositories');

describe('searchMedicosByAdmin Controller', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      query: {},
      user: { id: 'admin-1' },
    };
  });

  it('deve retornar 200 quando a busca for realizada com sucesso', async () => {
    const useCaseResult = {
      message: 'Médicos encontrados com sucesso.',
      data: [{ id: 'doctor-1', nomeCompleto: 'Dr. João' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };

    vi.spyOn(SearchDoctorsUseCase.prototype, 'execute').mockResolvedValue(useCaseResult as any);

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(SearchDoctorsUseCase.prototype.execute).toHaveBeenCalledWith({
      adminId: 'admin-1',
      criteria: {
        name: undefined,
        crm: undefined,
        email: undefined,
      },
      pagination: {
        page: 1,
        pageSize: 20,
      },
    });
    expect(mockReply.status).toHaveBeenCalledWith(200);
    expect(mockReply.send).toHaveBeenCalledWith(useCaseResult);
  });

  it('deve retornar 400 quando os parâmetros de busca forem inválidos', async () => {
    mockRequest.query = { email: 'email-invalido' };

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca inválidos.',
      }),
    );
  });

  it('deve retornar 401 quando o usuário não estiver autenticado', async () => {
    mockRequest.user = undefined;

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuário não autenticado',
    });
  });

  it('deve retornar 500 quando ocorrer erro inesperado no use-case', async () => {
    vi.spyOn(SearchDoctorsUseCase.prototype, 'execute').mockRejectedValue(new Error('erro'));

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao pesquisar médicos.',
    });
  });

  it('deve retornar 400 quando pageSize for maior que 100', async () => {
    mockRequest.query = { pageSize: '101' };

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca inválidos.',
      }),
    );
  });

  it('deve retornar 400 quando page for zero', async () => {
    mockRequest.query = { page: '0' };

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca inválidos.',
      }),
    );
  });

  it('deve retornar 400 quando pageSize for zero', async () => {
    mockRequest.query = { pageSize: '0' };

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca inválidos.',
      }),
    );
  });

  it('deve aceitar pageSize máximo de 100', async () => {
    const useCaseResult = {
      message: 'Médicos encontrados com sucesso.',
      data: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    };

    vi.spyOn(SearchDoctorsUseCase.prototype, 'execute').mockResolvedValue(useCaseResult as any);

    mockRequest.query = { pageSize: '100' };

    await searchMedicosByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(200);
    expect(SearchDoctorsUseCase.prototype.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 1, pageSize: 100 },
      }),
    );
  });
});
