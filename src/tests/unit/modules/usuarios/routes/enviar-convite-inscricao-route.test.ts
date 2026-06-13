import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enviarConviteInscricaoRoute } from '@/api/routes/users/enviar-convite-inscricao';
import { ConflictError } from '@/shared/errors/conflict-error';
import { container } from '@/infra/container';

describe('enviarConviteInscricaoRoute', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      body: { email: 'doc@test.com' },
      user: { id: 'admin-1', email: 'admin@test.com' },
    };
  });

  it('returns 201 when usecase succeeds', async () => {
    const executeSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(container, 'resolve').mockReturnValue({ execute: executeSpy } as any);

    await enviarConviteInscricaoRoute(mockRequest, mockReply);

    expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({ email: 'doc@test.com', adminId: 'admin-1' }));
    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith({ message: 'Convite enviado com sucesso.' });
  });

  it('returns 409 when usecase throws ConflictError', async () => {
    const executeSpy = vi.fn().mockRejectedValue(new ConflictError('Já existe'));
    vi.spyOn(container, 'resolve').mockReturnValue({ execute: executeSpy } as any);

    await enviarConviteInscricaoRoute(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(409);
    expect(mockReply.send).toHaveBeenCalledWith({ statusCode: 409, error: 'Conflict', message: 'Já existe' });
  });
});
