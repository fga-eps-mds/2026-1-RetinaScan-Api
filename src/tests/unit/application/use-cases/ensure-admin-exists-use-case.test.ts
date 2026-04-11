import { describe, it, expect, vi } from 'vitest';
import { EnsureAdminExistsUseCase } from '@/application/use-cases';
import type { IUsersRepository } from '@/application/ports/repositories';
import type { IAuthService } from '@/application/ports/services';
import type { User } from '@/domain';

const input = {
  name: 'Admin',
  email: 'admin@retinascan.com',
  password: 'super-secret',
  birthDate: new Date('1990-01-01'),
  crm: 'CRM-1234',
  cpf: '12345678900',
  identityNumber: 'RG-999',
};

const existingAdmin: User = {
  id: 'user-1',
  name: 'Admin',
  email: input.email,
  image: null,
  role: 'ADMIN',
  birthDate: '1990-01-01',
  crm: input.crm,
  cpf: input.cpf,
  identityNumber: input.identityNumber,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeUseCase() {
  const usersRepository = {
    findByEmail: vi.fn<IUsersRepository['findByEmail']>(),
    updateRoleByEmail: vi.fn<IUsersRepository['updateRoleByEmail']>(),
  };
  const authService = {
    signUp: vi.fn<IAuthService['signUp']>(),
  };
  const useCase = new EnsureAdminExistsUseCase(usersRepository, authService);
  return { useCase, usersRepository, authService };
}

describe('EnsureAdminExistsUseCase', () => {
  it('does nothing when a user with the given email already exists', async () => {
    const { useCase, usersRepository, authService } = makeUseCase();
    usersRepository.findByEmail.mockResolvedValue(existingAdmin);

    await useCase.execute(input);

    expect(usersRepository.findByEmail).toHaveBeenCalledWith(input.email);
    expect(authService.signUp).not.toHaveBeenCalled();
    expect(usersRepository.updateRoleByEmail).not.toHaveBeenCalled();
  });

  it('signs the user up and promotes to ADMIN when no user exists', async () => {
    const { useCase, usersRepository, authService } = makeUseCase();
    usersRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute(input);

    expect(authService.signUp).toHaveBeenCalledWith(input);
    expect(usersRepository.updateRoleByEmail).toHaveBeenCalledWith(input.email, 'ADMIN');
  });

  it('propagates errors from signUp without touching the role', async () => {
    const { useCase, usersRepository, authService } = makeUseCase();
    usersRepository.findByEmail.mockResolvedValue(null);
    authService.signUp.mockRejectedValue(new Error('signup failed'));

    await expect(useCase.execute(input)).rejects.toThrow('signup failed');
    expect(usersRepository.updateRoleByEmail).not.toHaveBeenCalled();
  });
});
