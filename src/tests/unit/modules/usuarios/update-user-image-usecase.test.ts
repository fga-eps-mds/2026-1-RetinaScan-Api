import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Usuario } from '@/modules/users/domain';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import { UpdateUserImageUsecase } from '@/modules/users/use-cases/update-user-image-usecase';
import { NotFoundError } from '@/shared/errors';
import { Buckets, type StorageService } from '@/shared/services';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  getAllUsers = vi.fn();
  update = vi.fn();
}

class FakeStorageService implements StorageService {
  upload = vi.fn();
  deleteByUrl = vi.fn();
}

const existingUser: Usuario = UsuarioBuilder.anUser().getData();

let repository: FakeUsuariosRepository;
let storageService: FakeStorageService;
let usecase: UpdateUserImageUsecase;

describe('UpdateUserImageUsecase', () => {
  beforeEach(() => {
    repository = new FakeUsuariosRepository();
    storageService = new FakeStorageService();
    usecase = new UpdateUserImageUsecase(repository, storageService);

    vi.clearAllMocks();
  });

  it('should upload the image and update the user with the returned URL', async () => {
    const imageBuffer = Buffer.from('fake-image');
    const uploadedUrl = 'https://storage.local/user-images/user-1-123';

    repository.findBy.mockResolvedValueOnce({ ...existingUser, image: null });
    storageService.upload.mockResolvedValueOnce(uploadedUrl);
    repository.update.mockResolvedValueOnce({ ...existingUser, image: uploadedUrl });

    await usecase.execute({
      idUsuario: existingUser.id,
      imageBuffer,
      contentType: 'image/png',
    });

    expect(storageService.upload).toHaveBeenCalledTimes(1);
    expect(storageService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining(`${existingUser.id}-`),
        buffer: imageBuffer,
        contentType: 'image/png',
      }),
      Buckets.userImages,
    );
    expect(repository.update).toHaveBeenCalledWith(existingUser.id, { image: uploadedUrl });
    expect(storageService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('should delete the previous image after successfully uploading and updating the new one', async () => {
    const previousUrl = `https://storage.local/user-images/${existingUser.id}-1700000000000`;
    const newUrl = `https://storage.local/user-images/${existingUser.id}-1800000000000`;

    repository.findBy.mockResolvedValueOnce({ ...existingUser, image: previousUrl });
    storageService.upload.mockResolvedValueOnce(newUrl);
    repository.update.mockResolvedValueOnce({ ...existingUser, image: newUrl });

    await usecase.execute({
      idUsuario: existingUser.id,
      imageBuffer: Buffer.from('img'),
      contentType: 'image/png',
    });

    expect(storageService.deleteByUrl).toHaveBeenCalledTimes(1);
    expect(storageService.deleteByUrl).toHaveBeenCalledWith(previousUrl, Buckets.userImages);

    const uploadOrder = storageService.upload.mock.invocationCallOrder[0];
    const updateOrder = repository.update.mock.invocationCallOrder[0];
    const deleteOrder = storageService.deleteByUrl.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(updateOrder);
    expect(updateOrder).toBeLessThan(deleteOrder);
  });

  it('should propagate the error when deleting the previous image fails', async () => {
    const previousUrl = `https://storage.local/user-images/${existingUser.id}-old`;
    const newUrl = `https://storage.local/user-images/${existingUser.id}-new`;

    repository.findBy.mockResolvedValueOnce({ ...existingUser, image: previousUrl });
    storageService.upload.mockResolvedValueOnce(newUrl);
    repository.update.mockResolvedValueOnce({ ...existingUser, image: newUrl });
    storageService.deleteByUrl.mockRejectedValueOnce(new Error('Minio Bucket is down'));

    await expect(
      usecase.execute({
        idUsuario: existingUser.id,
        imageBuffer: Buffer.from('img'),
        contentType: 'image/png',
      }),
    ).rejects.toThrow('Minio Bucket is down');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    repository.findBy.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idUsuario: 'user-nao-existe',
        imageBuffer: Buffer.from('img'),
        contentType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(storageService.upload).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(storageService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('should propagate error from storage and not update the repository', async () => {
    repository.findBy.mockResolvedValueOnce(existingUser);
    storageService.upload.mockRejectedValueOnce(new Error('storage indisponível'));

    await expect(
      usecase.execute({
        idUsuario: existingUser.id,
        imageBuffer: Buffer.from('img'),
        contentType: 'image/png',
      }),
    ).rejects.toThrow('storage indisponível');

    expect(repository.update).not.toHaveBeenCalled();
    expect(storageService.deleteByUrl).not.toHaveBeenCalled();
  });
});
