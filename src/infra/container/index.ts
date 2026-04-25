import { asClass, asFunction, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import {
  DrizzleSolicitacaoCpfCrmRepository,
  DrizzleUsuariosRepository,
  DrizzleExamesRepository,
} from '@/infra/database/drizzle/repositories';
import { BetterAuthService } from '@/infra/auth/better-auth-service';
import { MinioStorageService } from '@/infra/storage/minio-storage-service';
import { NodeCryptoCryptographyService } from '@/infra/shared/node-cryptography-service';
import { DefaultMaskingService } from '@/infra/shared/default-masking-service';
import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { UpdateUserUsecase } from '@/modules/users/use-cases/update-user-usecase';
import { UpdateUserImageUsecase } from '@/modules/users/use-cases/update-user-image-usecase';
import { SolicitarAlteracaoCpfCrmUsecase } from '@/modules/users/use-cases/solicitar-alteracao-cpf-crm';
import { AprovarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/aprovar-solicitacao-cpf-crm';
import { RejeitarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/rejeitar-solicitacao-cpf-crm';
import { ListarSolicitacoesCpfCrmUsecase } from '@/modules/users/use-cases/listar-solicitacoes-cpf-crm';
import type { UsuariosRepository, SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import { CreateExamUseCase } from '@/modules/exam/use-cases/create-exam-usecase';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { AuthService } from '@/shared/services/auth-service';
import type { StorageService } from '@/shared/services/storage-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import type { MaskingService } from '@/shared/services/masking-service';

export interface AppContainer {
  usuariosRepository: UsuariosRepository;
  solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository;
  examesRepository: ExamesRepository;
  authService: AuthService;
  storageService: StorageService;
  cryptographyService: CryptographyService;
  maskingService: MaskingService;
  createUserByAdmin: CreateUserByAdmin;
  updateUserUsecase: UpdateUserUsecase;
  updateUserImageUsecase: UpdateUserImageUsecase;
  solicitarAlteracaoCpfCrmUsecase: SolicitarAlteracaoCpfCrmUsecase;
  aprovarSolicitacaoCpfCrmUsecase: AprovarSolicitacaoCpfCrmUsecase;
  rejeitarSolicitacaoCpfCrmUsecase: RejeitarSolicitacaoCpfCrmUsecase;
  listarSolicitacoesCpfCrmUsecase: ListarSolicitacoesCpfCrmUsecase;
  createExamUseCase: CreateExamUseCase;
}

export const container: AwilixContainer<AppContainer> = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  usuariosRepository: asClass(DrizzleUsuariosRepository).singleton(),
  solicitacaoCpfCrmRepository: asClass(DrizzleSolicitacaoCpfCrmRepository).singleton(),
  examesRepository: asClass(DrizzleExamesRepository).singleton(),
  authService: asClass(BetterAuthService).singleton(),
  storageService: asClass(MinioStorageService).singleton(),
  cryptographyService: asClass(NodeCryptoCryptographyService).singleton(),
  maskingService: asClass(DefaultMaskingService).singleton(),
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
  createExamUseCase: asFunction(
    ({ usuariosRepository, examesRepository, cryptographyService, maskingService }: AppContainer) =>
      new CreateExamUseCase(
        usuariosRepository,
        examesRepository,
        cryptographyService,
        maskingService,
      ),
  ).scoped(),
});
