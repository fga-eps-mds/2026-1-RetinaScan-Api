import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));
vi.mock('@/env', () => ({
  env: {
    BETTER_AUTH_SECRET: 'test',
    BETTER_AUTH_URL: 'http://localhost:3000',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  },
}));

import { auth } from '@/lib/auth';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { ConflictError } from '@/shared/errors/conflict-error';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  update = vi.fn();
}

let repository: FakeUsuariosRepository;
let sut: CreateUserByAdmin;

describe('Create User By Admin', () => {
  beforeEach(() => {
    repository = new FakeUsuariosRepository();
    sut = new CreateUserByAdmin(repository);

    vi.clearAllMocks();
  });

  it('should create user successfully', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByCpf.mockResolvedValue(null);
    repository.findByCrm.mockResolvedValue(null);

    vi.mocked(auth.api.signUpEmail).mockResolvedValue({} as never);

    await expect(
      sut.execute({
        nomeCompleto: 'Gustavo Costa',
        email: 'gustavo@email.com',
        cpf: '12345678909',
        crm: '12345',
        dtNascimento: new Date('2002-10-17'),
        senha: '123456',
        tipoPerfil: 'MEDICO',
      }),
    ).resolves.toBeUndefined();

    expect(auth.api.signUpEmail).toHaveBeenCalled();
  });

  it('should not allow duplicated email', async () => {
    repository.findByEmail.mockResolvedValue({ id: '1' });

    await expect(
      sut.execute({
        nomeCompleto: 'Teste',
        email: 'teste@email.com',
        cpf: '123',
        crm: '321',
        dtNascimento: new Date('2002-10-17'),
        senha: '123456',
        tipoPerfil: 'MEDICO',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should not allow duplicated cpf', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByCpf.mockResolvedValue({ id: '1' });

    await expect(
      sut.execute({
        nomeCompleto: 'Teste',
        email: 'teste@email.com',
        cpf: '123',
        crm: '321',
        dtNascimento: new Date('2002-10-17'),
        senha: '123456',
        tipoPerfil: 'MEDICO',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should not allow duplicated crm', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByCpf.mockResolvedValue(null);
    repository.findByCrm.mockResolvedValue({ id: '1' });

    await expect(
      sut.execute({
        nomeCompleto: 'Teste',
        email: 'teste@email.com',
        cpf: '123',
        crm: '321',
        dtNascimento: new Date('2002-10-17'),
        senha: '123456',
        tipoPerfil: 'MEDICO',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
