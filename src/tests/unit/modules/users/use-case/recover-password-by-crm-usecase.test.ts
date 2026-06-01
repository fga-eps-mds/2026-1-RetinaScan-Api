import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { RecoverPasswordByCrmUseCase } from '@/modules/users/use-cases/recover-password-by-crm-usecase';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { MaskingService } from '@/shared/services';
import { NotFoundError } from '@/shared/errors';
import type { Usuario } from '@/modules/users/domain/usuario';

describe('RecoverPasswordByCrmUseCase', () => {
  let usuariosRepository: Mocked<UsuariosRepository>;
  let maskingService: Mocked<MaskingService>;
  let useCase: RecoverPasswordByCrmUseCase;

  beforeEach(() => {
    usuariosRepository = {
      findByCrm: vi.fn(),
    } as unknown as Mocked<UsuariosRepository>;

    maskingService = {
      maskEmail: vi.fn(),
    } as unknown as Mocked<MaskingService>;

    useCase = new RecoverPasswordByCrmUseCase(usuariosRepository, maskingService);
  });

  it('should return the original and masked email when a user is found', async () => {
    const mockUser: Usuario = {
      id: '123',
      email: 'medico@exemplo.com',
      crm: '12345-DF',
      nomeCompleto: 'Dr. João',
      cpf: '00000000000',
      dtNascimento: '1990-01-01',
      status: 'ATIVO',
      tipoPerfil: 'MEDICO',
    };

    usuariosRepository.findByCrm.mockResolvedValueOnce(mockUser);
    maskingService.maskEmail.mockReturnValueOnce('m*****@exemplo.com');

    const result = await useCase.execute({ crm: '12345-DF' });

    expect(usuariosRepository.findByCrm).toHaveBeenCalledWith('12345-DF');
    expect(maskingService.maskEmail).toHaveBeenCalledWith('medico@exemplo.com');
    expect(result).toEqual({
      email: 'medico@exemplo.com',
      maskedEmail: 'm*****@exemplo.com',
    });
  });

  it('should throw NotFoundError when user is not found', async () => {
    usuariosRepository.findByCrm.mockResolvedValueOnce(null);

    await expect(useCase.execute({ crm: 'INVALID' })).rejects.toThrow(NotFoundError);
    expect(usuariosRepository.findByCrm).toHaveBeenCalledWith('INVALID');
    expect(maskingService.maskEmail).not.toHaveBeenCalled();
  });
});
