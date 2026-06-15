import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AvaliarInscricaoUsecase } from '@/modules/users/use-cases/avaliar-inscricao-usecase';
import { NotFoundError } from '@/shared/errors/not-found-error';
import { ConflictError } from '@/shared/errors/conflict-error';
import { ValidationError } from '@/shared/errors/validation-error';
import { auth } from '@/lib/auth';

const pendingInscricao = {
  id: 'inscricao-id',
  status: 'PENDENTE',
  email: 'doc@test.com',
  nomeCompleto: 'Dr. João',
  cpf: '12345678900',
  crm: '123456',
  dtNascimento: '1985-03-15',
  tipoPerfil: 'MEDICO',
  encryptedPassword: 'encrypted:abc',
};

describe('AvaliarInscricaoUsecase', () => {
  let inscricaoRepo: any;
  let cryptographyService: any;
  let signUpEmailSpy: ReturnType<typeof vi.spyOn>;
  let usecase: AvaliarInscricaoUsecase;

  beforeEach(() => {
    vi.clearAllMocks();

    inscricaoRepo = {
      findById: vi.fn().mockResolvedValue(pendingInscricao),
      avaliar: vi.fn().mockResolvedValue({ ...pendingInscricao, status: 'APROVADA' }),
    };

    cryptographyService = {
      decrypt: vi.fn().mockReturnValue({ text: 'plain-password' }),
    };

    signUpEmailSpy = vi.spyOn(auth.api, 'signUpEmail').mockResolvedValue(undefined as any);

    usecase = new AvaliarInscricaoUsecase(inscricaoRepo, cryptographyService);
  });

  afterEach(() => {
    signUpEmailSpy.mockRestore();
  });

  it('should decrypt password and call signUpEmail when aprovada', async () => {
    await usecase.execute({
      inscricaoId: 'inscricao-id',
      adminId: 'admin-id',
      decisao: 'APROVADA',
    });

    expect(cryptographyService.decrypt).toHaveBeenCalledWith({ encryptedText: 'encrypted:abc' });
    expect(signUpEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: 'doc@test.com',
          password: 'plain-password',
          cpf: '12345678900',
        }),
      }),
    );
    expect(inscricaoRepo.avaliar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inscricao-id', decisao: 'APROVADA', analisadoPor: 'admin-id' }),
    );
  });

  it('should mark as REJEITADA with motivo without calling signUpEmail', async () => {
    await usecase.execute({
      inscricaoId: 'inscricao-id',
      adminId: 'admin-id',
      decisao: 'REJEITADA',
      motivoRejeicao: 'Documentação inválida',
    });

    expect(signUpEmailSpy).not.toHaveBeenCalled();
    expect(cryptographyService.decrypt).not.toHaveBeenCalled();
    expect(inscricaoRepo.avaliar).toHaveBeenCalledWith(
      expect.objectContaining({
        decisao: 'REJEITADA',
        motivoRejeicao: 'Documentação inválida',
      }),
    );
  });

  it('should throw ValidationError when REJEITADA without motivoRejeicao', async () => {
    await expect(
      usecase.execute({ inscricaoId: 'inscricao-id', adminId: 'admin-id', decisao: 'REJEITADA' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should throw NotFoundError when inscricao does not exist', async () => {
    inscricaoRepo.findById.mockResolvedValue(null);
    await expect(
      usecase.execute({ inscricaoId: 'x', adminId: 'admin-id', decisao: 'APROVADA' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ConflictError when inscricao is not PENDENTE', async () => {
    inscricaoRepo.findById.mockResolvedValue({ ...pendingInscricao, status: 'APROVADA' });
    await expect(
      usecase.execute({ inscricaoId: 'inscricao-id', adminId: 'admin-id', decisao: 'APROVADA' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
