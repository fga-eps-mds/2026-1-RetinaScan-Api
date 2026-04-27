import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Usuario } from '@/modules/users/domain';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import { UpdateUserUsecase } from '@/modules/users/use-cases/update-user-usecase';
import { ConflictError } from '@/shared/errors/conflict-error';
import { NotFoundError } from '@/shared/errors';
import type { AuthService } from '@/shared/services/auth-service';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  update = vi.fn();
}

class FakeAuthService implements AuthService {
  changePassword = vi.fn();
  changeEmail = vi.fn();
}

const existingUser: Usuario = UsuarioBuilder.anUser().getData();

let repository: FakeUsuariosRepository;
let authService: FakeAuthService;
let usecase: UpdateUserUsecase;

describe('UpdateUserUsecase', () => {
  beforeEach(() => {
    repository = new FakeUsuariosRepository();
    authService = new FakeAuthService();
    usecase = new UpdateUserUsecase(repository, authService);

    vi.clearAllMocks();
  });

  it('should update the user name successfully', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser);
    repository.update.mockResolvedValueOnce({
      ...existingUser,
      nomeCompleto: 'Arthur Ribeiro',
    });

    const result = await usecase.execute({
      idUsuario: 'user-1',
      headers: new Headers(),
      data: { nomeCompleto: 'Arthur Ribeiro' },
    });

    expect(repository.update).toHaveBeenCalledWith('user-1', {
      nomeCompleto: 'Arthur Ribeiro',
    });
    expect(result.usuario.nomeCompleto).toBe('Arthur Ribeiro');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    repository.findBy.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idUsuario: 'user-nao-existe',
        headers: new Headers(),
        data: { nomeCompleto: 'Qualquer Nome' },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reject duplicate email with ConflictError', async () => {
    repository.findBy
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce({ ...existingUser, id: 'outro-user', email: 'novo@email.com' });

    await expect(
      usecase.execute({
        idUsuario: 'user-1',
        headers: new Headers(),
        data: { email: 'novo@email.com' },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should allow email equal to the users own', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser);
    repository.update.mockResolvedValueOnce(existingUser);

    await expect(
      usecase.execute({
        idUsuario: 'user-1',
        headers: new Headers(),
        data: { email: existingUser.email },
      }),
    ).resolves.toBeDefined();

    expect(repository.findBy).toHaveBeenCalledTimes(1);
    expect(authService.changeEmail).not.toHaveBeenCalled();
  });

  it('should call changeEmail and not send email to the repository when email changes', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser).mockResolvedValueOnce(null);
    repository.update.mockResolvedValueOnce({ ...existingUser, email: 'novo@email.com' });
    authService.changeEmail.mockResolvedValueOnce(undefined);

    const headers = new Headers();

    await usecase.execute({
      idUsuario: 'user-1',
      headers,
      data: { email: 'novo@email.com', nomeCompleto: 'Arthur' },
    });

    expect(authService.changeEmail).toHaveBeenCalledWith({ newEmail: 'novo@email.com' }, headers);
    expect(repository.update).toHaveBeenCalledWith('user-1', { nomeCompleto: 'Arthur' });
  });

  it('should call changePassword when both passwords are provided', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser);
    repository.update.mockResolvedValueOnce(existingUser);
    authService.changePassword.mockResolvedValueOnce(undefined);

    const headers = new Headers();

    await usecase.execute({
      idUsuario: 'user-1',
      headers,
      data: {},
      senhaAtual: 'senha-atual',
      novaSenha: 'nova-senha-123',
    });

    expect(authService.changePassword).toHaveBeenCalledWith(
      {
        currentPassword: 'senha-atual',
        newPassword: 'nova-senha-123',
      },
      headers,
    );
  });

  it('should call update with empty data when no fields are provided', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser);
    repository.update.mockResolvedValueOnce(existingUser);

    await usecase.execute({
      idUsuario: 'user-1',
      headers: new Headers(),
      data: {},
    });

    expect(repository.update).toHaveBeenCalledWith('user-1', {});
  });
});
