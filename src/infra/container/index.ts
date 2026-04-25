import { asClass, asFunction, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import {
  DrizzleSolicitacaoCpfCrmRepository,
  DrizzleUsuariosRepository,
} from '@/infra/database/drizzle/repositories';
import { BetterAuthService } from '@/infra/auth/better-auth-service';
import { MinioStorageService } from '@/infra/storage/minio-storage-service';
import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { UpdateUserUsecase } from '@/modules/users/use-cases/update-user-usecase';
import { UpdateUserImageUsecase } from '@/modules/users/use-cases/update-user-image-usecase';
import { SolicitarAlteracaoCpfCrmUsecase } from '@/modules/users/use-cases/solicitar-alteracao-cpf-crm';
import { AprovarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/aprovar-solicitacao-cpf-crm';
import { RejeitarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/rejeitar-solicitacao-cpf-crm';
import { ListarSolicitacoesCpfCrmUsecase } from '@/modules/users/use-cases/listar-solicitacoes-cpf-crm';
import type { UsuariosRepository, SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import type { AuthService } from '@/shared/services/auth-service';
import type { StorageService } from '@/shared/services/storage-service';

export interface AppContainer {
  usuariosRepository: UsuariosRepository;
  solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository;
  authService: AuthService;
  storageService: StorageService;
  createUserByAdmin: CreateUserByAdmin;
  updateUserUsecase: UpdateUserUsecase;
  updateUserImageUsecase: UpdateUserImageUsecase;
  solicitarAlteracaoCpfCrmUsecase: SolicitarAlteracaoCpfCrmUsecase;
  aprovarSolicitacaoCpfCrmUsecase: AprovarSolicitacaoCpfCrmUsecase;
  rejeitarSolicitacaoCpfCrmUsecase: RejeitarSolicitacaoCpfCrmUsecase;
  listarSolicitacoesCpfCrmUsecase: ListarSolicitacoesCpfCrmUsecase;
}

export const container: AwilixContainer<AppContainer> = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  usuariosRepository: asClass(DrizzleUsuariosRepository).singleton(),
  solicitacaoCpfCrmRepository: asClass(DrizzleSolicitacaoCpfCrmRepository).singleton(),
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
  solicitarAlteracaoCpfCrmUsecase: asFunction(
    ({ usuariosRepository, solicitacaoCpfCrmRepository }: AppContainer) =>
      new SolicitarAlteracaoCpfCrmUsecase(usuariosRepository, solicitacaoCpfCrmRepository),
  ).scoped(),
  aprovarSolicitacaoCpfCrmUsecase: asFunction(
    ({ usuariosRepository, solicitacaoCpfCrmRepository }: AppContainer) =>
      new AprovarSolicitacaoCpfCrmUsecase(usuariosRepository, solicitacaoCpfCrmRepository),
  ).scoped(),
  rejeitarSolicitacaoCpfCrmUsecase: asFunction(
    ({ usuariosRepository, solicitacaoCpfCrmRepository }: AppContainer) =>
      new RejeitarSolicitacaoCpfCrmUsecase(usuariosRepository, solicitacaoCpfCrmRepository),
  ).scoped(),
  listarSolicitacoesCpfCrmUsecase: asFunction(
    ({ solicitacaoCpfCrmRepository }: AppContainer) =>
      new ListarSolicitacoesCpfCrmUsecase(solicitacaoCpfCrmRepository),
  ).scoped(),
});
