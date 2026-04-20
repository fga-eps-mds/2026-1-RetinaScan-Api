import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetAllUsers } from '../../../../modules/users/use-cases/get-all-users';
import type { UsuariosRepository } from '../../../../modules/users/repositories/users-repository';
import type { Usuario } from '../../../../modules/users/domain/usuario';

describe('GetAllUsers Use Case', () => {
  // SUT = System Under Test (O sistema que estamos testando)
  let sut: GetAllUsers;
  let usuariosRepositoryMock: UsuariosRepository;

  beforeEach(() => {
    usuariosRepositoryMock = {
      getAllUsers: vi.fn(),
    } as unknown as UsuariosRepository;

    sut = new GetAllUsers(usuariosRepositoryMock);
  });

  it('deve retornar a lista de usuários com sucesso', async () => {
    const mockUsers = [
      { id: '1', nomeCompleto: 'João Silva' },
      { id: '2', nomeCompleto: 'Maria Souza' },
    ] as Usuario[];

    vi.mocked(usuariosRepositoryMock.getAllUsers).mockResolvedValueOnce(mockUsers);

    const result = await sut.execute();

    expect(usuariosRepositoryMock.getAllUsers).toHaveBeenCalledTimes(1);

    expect(result).toEqual(mockUsers);
  });

  it('deve retornar uma lista vazia se o repositório não encontrar nada', async () => {
    vi.mocked(usuariosRepositoryMock.getAllUsers).mockResolvedValueOnce([]);

    const result = await sut.execute();

    expect(usuariosRepositoryMock.getAllUsers).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('deve repassar o erro caso o repositório falhe (ex: queda de banco de dados)', async () => {
    const erroBanco = new Error('Conexão perdida');
    vi.mocked(usuariosRepositoryMock.getAllUsers).mockRejectedValueOnce(erroBanco);

    await expect(sut.execute()).rejects.toThrow('Conexão perdida');
    expect(usuariosRepositoryMock.getAllUsers).toHaveBeenCalledTimes(1);
  });
});
