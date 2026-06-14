import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubmeterInscricaoUsecase } from '@/modules/users/use-cases/submeter-inscricao-usecase';
import { ConflictError } from '@/shared/errors/conflict-error';
import { NotFoundError } from '@/shared/errors/not-found-error';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

const validInscricao = {
  id: 'inscricao-id',
  status: 'CONVITE_ENVIADO',
  email: 'doc@test.com',
};

const validPayload = {
  sub: 'inscricao-id',
  email: 'doc@test.com',
  nomeCompleto: 'Dr. João',
  tipoPerfil: 'MEDICO' as const,
};

describe('SubmeterInscricaoUsecase', () => {
  let inscricaoRepo: any;
  let usuariosRepo: any;
  let inviteTokenService: any;
  let cryptographyService: any;
  let usecase: SubmeterInscricaoUsecase;

  beforeEach(() => {
    vi.clearAllMocks();

    inscricaoRepo = {
      findById: vi.fn().mockResolvedValue(validInscricao),
      submeter: vi.fn().mockResolvedValue({ ...validInscricao, status: 'PENDENTE' }),
    };

    usuariosRepo = {
      findByCpf: vi.fn().mockResolvedValue(null),
      findByCrm: vi.fn().mockResolvedValue(null),
    };

    inviteTokenService = {
      verify: vi.fn().mockResolvedValue(validPayload),
    };

    cryptographyService = {
      encrypt: vi.fn().mockReturnValue({ encryptedText: 'encrypted-password' }),
    };

    usecase = new SubmeterInscricaoUsecase(
      inscricaoRepo,
      usuariosRepo,
      inviteTokenService,
      cryptographyService,
    );
  });

  const validInput = {
    token: 'valid.jwt.token',
    nomeCompleto: 'Dr. João Silva',
    cpf: '12345678900',
    crm: '123456',
    dtNascimento: '1985-03-15',
    senha: 'senha123',
  };

  it('should submeter inscricao and encrypt password', async () => {
    await usecase.execute(validInput);

    expect(cryptographyService.encrypt).toHaveBeenCalledWith({ text: 'senha123' });
    expect(inscricaoRepo.submeter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inscricao-id',
        nomeCompleto: 'Dr. João Silva',
        cpf: '12345678900',
        crm: '123456',
        encryptedPassword: 'encrypted-password',
      }),
    );
  });

  it('should throw UnauthorizedError when token is invalid', async () => {
    inviteTokenService.verify.mockRejectedValue(new Error('invalid token'));

    await expect(usecase.execute(validInput)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('should throw NotFoundError when inscricao does not exist', async () => {
    inscricaoRepo.findById.mockResolvedValue(null);

    await expect(usecase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ConflictError when status is not CONVITE_ENVIADO', async () => {
    inscricaoRepo.findById.mockResolvedValue({ ...validInscricao, status: 'PENDENTE' });

    await expect(usecase.execute(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw ConflictError when CPF already taken', async () => {
    usuariosRepo.findByCpf.mockResolvedValue({ id: 'u1' });

    await expect(usecase.execute(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw ConflictError when CRM already taken', async () => {
    usuariosRepo.findByCrm.mockResolvedValue({ id: 'u1' });

    await expect(usecase.execute(validInput)).rejects.toBeInstanceOf(ConflictError);
  });
});
