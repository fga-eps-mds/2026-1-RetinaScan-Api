import { asClass, asFunction, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { BetterAuthService } from '@/infra/auth/better-auth-service';
import { MinioStorageService } from '@/infra/storage/minio-storage-service';
import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { UpdateUserUsecase } from '@/modules/users/use-cases/update-user-usecase';
import { UpdateUserImageUsecase } from '@/modules/users/use-cases/update-user-image-usecase';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { AuthService } from '@/shared/services/auth-service';
import type { StorageService } from '@/shared/services/storage-service';

export interface AppContainer {
  usuariosRepository: UsuariosRepository;
  authService: AuthService;
  storageService: StorageService;
  createUserByAdmin: CreateUserByAdmin;
  updateUserUsecase: UpdateUserUsecase;
  updateUserImageUsecase: UpdateUserImageUsecase;
}

export const container: AwilixContainer<AppContainer> = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  usuariosRepository: asClass(DrizzleUsuariosRepository).singleton(),
  authService: asClass(BetterAuthService).singleton(),
  storageService: asClass(MinioStorageService).singleton(),
  createUserByAdmin: asFunction(
    ({ usuariosRepository }: AppContainer) => new CreateUserByAdmin(usuariosRepository),
  ).scoped(),
  updateUserUsecase: asFunction(
    ({ usuariosRepository, authService }: AppContainer) =>
      new UpdateUserUsecase(usuariosRepository, authService),
  ).scoped(),
  updateUserImageUsecase: asFunction(
    ({ usuariosRepository, storageService }: AppContainer) =>
      new UpdateUserImageUsecase(usuariosRepository, storageService),
  ).scoped(),
});
