import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserByAdmin } from '../../../../../api/routes/users/create-user-by-admin';
import { CreateUserByAdmin } from '@/modules/users/use-cases';
import { better_auth_errors } from '@/shared/errors/better-auth-errors';

// 1. Mock das dependências externas
vi.mock('@/modules/users/use-cases');
vi.mock('@/infra/database/drizzle/repositories');

describe('createUserByAdmin Controller', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock do objeto Reply do Fastify com interface fluente (status().send())
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Dados base válidos para o request
    mockRequest = {
      body: {
        nomeCompleto: 'João Silva',
        email: 'joao@email.com',
        cpf: '12345678909', // Deve ser um CPF válido para passar no isValidCpf
        crm: '12345',
        dtNascimento: '1990-01-01',
        senha: 'password123',
        tipoPerfil: 'MEDICO',
      },
    };
  });

  it('deve retornar 201 quando o usuário é criado com sucesso', async () => {
    // Mock do método execute do Use Case para resolver sem erros
    const executeSpy = vi
      .spyOn(CreateUserByAdmin.prototype, 'execute')
      .mockResolvedValue(undefined as any);

    await createUserByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith({
      message: 'Usuário criado com sucesso.',
    });
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'joao@email.com',
        cpf: '12345678909',
      }),
    );
  });

  it('deve retornar 400 se a validação do Zod falhar', async () => {
    mockRequest.body.email = 'email-invalido';

    await createUserByAdmin(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Dados inválidos.',
        errors: expect.objectContaining({
          email: ['Email inválido.'],
        }),
      }),
    );
  });

  describe('Tratamento de Erros (getErrorCode)', () => {
    it('deve retornar erro traduzido quando o Use Case lança um erro com código do Better Auth', async () => {
      // Simula o erro no formato { body: { code: '...' } }
      const authError = {
        body: { code: 'USER_ALREADY_EXISTS' },
      };

      vi.spyOn(CreateUserByAdmin.prototype, 'execute').mockRejectedValue(authError);

      await createUserByAdmin(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 400,
        error: 'Bad Request',
        message: better_auth_errors['USER_ALREADY_EXISTS'] ?? 'Erro ao criar usuário.',
      });
    });

    it('deve retornar mensagem padrão quando o erro não possui código conhecido', async () => {
      vi.spyOn(CreateUserByAdmin.prototype, 'execute').mockRejectedValue(
        new Error('Erro Desconhecido'),
      );

      await createUserByAdmin(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Erro ao criar usuário.',
        }),
      );
    });

    it('deve retornar mensagem padrão quando o erro é nulo ou formato inválido', async () => {
      vi.spyOn(CreateUserByAdmin.prototype, 'execute').mockRejectedValue(null);

      await createUserByAdmin(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Erro ao criar usuário.',
        }),
      );
    });

    it('deve lidar com casos onde o código não é uma string', async () => {
      vi.spyOn(CreateUserByAdmin.prototype, 'execute').mockRejectedValue({ body: { code: 123 } });

      await createUserByAdmin(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Erro ao criar usuário.',
        }),
      );
    });
  });
});
