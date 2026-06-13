import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnviarConviteInscricaoUsecase } from '@/modules/users/use-cases/enviar-convite-inscricao';
import { ConflictError } from '@/shared/errors/conflict-error';

describe('EnviarConviteInscricaoUsecase', () => {
  let inscricaoRepo: any;
  let usuariosRepo: any;
  let emailProvider: any;
  let usecase: EnviarConviteInscricaoUsecase;

  beforeEach(() => {
    vi.clearAllMocks();

    inscricaoRepo = {
      criar: vi.fn().mockResolvedValue(undefined),
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    usuariosRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    emailProvider = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    usecase = new EnviarConviteInscricaoUsecase(inscricaoRepo, usuariosRepo, emailProvider);
  });

  it('should create invite and send email when input is valid', async () => {
    await usecase.execute({ email: 'doc@test.com', tipoPerfil: 'MEDICO', adminId: 'admin-id' });

    expect(inscricaoRepo.criar).toHaveBeenCalledTimes(1);
    const criarArg = inscricaoRepo.criar.mock.calls[0][0];
    expect(criarArg.email).toBe('doc@test.com');
    expect(typeof criarArg.token).toBe('string');
    expect(criarArg.tokenExpiresAt).toBeInstanceOf(Date);

    expect(emailProvider.send).toHaveBeenCalledTimes(1);
    expect(emailProvider.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'doc@test.com' }));
  });

  it('should throw ConflictError when user already exists', async () => {
    usuariosRepo.findByEmail.mockResolvedValue({ id: 'u1' });

    await expect(
      usecase.execute({ email: 'existing@test.com', adminId: 'admin-id' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw ConflictError when there is an active invite', async () => {
    inscricaoRepo.findByEmail.mockResolvedValue({ status: 'CONVITE_ENVIADO', tokenExpiresAt: new Date(Date.now() + 10000) });

    await expect(
      usecase.execute({ email: 'invite@test.com', adminId: 'admin-id' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
