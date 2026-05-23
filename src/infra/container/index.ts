import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import type { FastifyInstance } from 'fastify';

import {
  DrizzleSolicitacaoCpfCrmRepository,
  DrizzleUsuariosRepository,
  DrizzleExamesRepository,
  DrizzleImagemRepository,
  DrizzleResultadoIaRepository,
  DrizzleExamIaErrorRepository,
  DrizzleNotificationRepository,
} from '@/infra/database/drizzle/repositories';

import { BetterAuthService } from '@/infra/auth/better-auth-service';
import { BullMQMessageBroker } from '@/infra/queue/notify-bullmq-service';
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
import { UploadExamImagesUseCase } from '@/modules/exam/use-cases/upload-exam-images-usecase';
import { ListExamsUseCase } from '@/modules/exam/use-cases/list-exams-usecase';
import { RegisterExamAiResultUseCase } from '@/modules/exam/use-cases/register-exam-ai-result-usecase';
import { RegisterExamAiErrorUseCase } from '@/modules/exam/use-cases/register-exam-ai-error-usecase';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import type { ExamIaErrorRepository } from '@/modules/exam/exam-ia-error-repository';

import type { AuthService } from '@/shared/services/auth-service';
import type { StorageService } from '@/shared/services/storage-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import type { MaskingService } from '@/shared/services/masking-service';
import type { MessageBroker } from '@/shared/services/message-broker';
import type { NotificationsRepository } from '@/modules/notification/repositories';
import { NotificationService } from '@/modules/notification/services';
import { ListMyNotificationsUsecase } from '@/modules/notification/use-case/list-my-notifications-use-case';
import { DeleteNotificationUseCase } from '@/modules/notification/use-case/delete-notification-use-case';
import { MarkNotificationAsReadUseCase } from '@/modules/notification/use-case/mark-notification-as-read-use-case';

export interface AppContainer {
  app: FastifyInstance;
  usuariosRepository: UsuariosRepository;
  solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository;
  notificationRepository: NotificationsRepository;
  examesRepository: ExamesRepository;
  imagemRepository: ImagemRepository;
  resultadoIaRepository: ResultadoIaRepository;
  examIaErrorRepository: ExamIaErrorRepository;
  authService: AuthService;
  storageService: StorageService;
  cryptographyService: CryptographyService;
  maskingService: MaskingService;
  messageBroker: MessageBroker;
  createUserByAdmin: CreateUserByAdmin;
  updateUserUsecase: UpdateUserUsecase;
  updateUserImageUsecase: UpdateUserImageUsecase;
  solicitarAlteracaoCpfCrmUsecase: SolicitarAlteracaoCpfCrmUsecase;
  aprovarSolicitacaoCpfCrmUsecase: AprovarSolicitacaoCpfCrmUsecase;
  rejeitarSolicitacaoCpfCrmUsecase: RejeitarSolicitacaoCpfCrmUsecase;
  listarSolicitacoesCpfCrmUsecase: ListarSolicitacoesCpfCrmUsecase;
  createExamUseCase: CreateExamUseCase;
  uploadExamImagesUseCase: UploadExamImagesUseCase;
  listExamsUseCase: ListExamsUseCase;
  registerExamAiResultUseCase: RegisterExamAiResultUseCase;
  registerExamAiErrorUseCase: RegisterExamAiErrorUseCase;
  notificationService: NotificationService;
  listMyNotificationsUsecase: ListMyNotificationsUsecase;
  deleteNotificationUseCase: DeleteNotificationUseCase;
  markNotificationAsReadUseCase: MarkNotificationAsReadUseCase;
}

export const container: AwilixContainer<AppContainer> = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  app: asValue({} as FastifyInstance),

  usuariosRepository: asClass(DrizzleUsuariosRepository).singleton(),
  solicitacaoCpfCrmRepository: asClass(DrizzleSolicitacaoCpfCrmRepository).singleton(),
  notificationRepository: asClass(DrizzleNotificationRepository).singleton(),
  examesRepository: asClass(DrizzleExamesRepository).singleton(),
  imagemRepository: asClass(DrizzleImagemRepository).singleton(),
  resultadoIaRepository: asClass(DrizzleResultadoIaRepository).singleton(),
  examIaErrorRepository: asClass(DrizzleExamIaErrorRepository).singleton(),

  authService: asClass(BetterAuthService).singleton(),
  storageService: asClass(MinioStorageService).singleton(),
  cryptographyService: asClass(NodeCryptoCryptographyService).singleton(),
  maskingService: asClass(DefaultMaskingService).singleton(),
  messageBroker: asClass(BullMQMessageBroker).singleton(),

  markNotificationAsReadUseCase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new MarkNotificationAsReadUseCase(notificationRepository),
  ).scoped(),

  deleteNotificationUseCase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new DeleteNotificationUseCase(notificationRepository),
  ).scoped(),
  notificationService: asFunction(
    ({ app, notificationRepository }: AppContainer) =>
      new NotificationService({
        app,
        notificationRepository,
      }),
  ).scoped(),

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
    ({ usuariosRepository, solicitacaoCpfCrmRepository, notificationService }: AppContainer) =>
      new AprovarSolicitacaoCpfCrmUsecase(
        usuariosRepository,
        solicitacaoCpfCrmRepository,
        notificationService,
      ),
  ).scoped(),

  rejeitarSolicitacaoCpfCrmUsecase: asFunction(
    ({ usuariosRepository, solicitacaoCpfCrmRepository, notificationService }: AppContainer) =>
      new RejeitarSolicitacaoCpfCrmUsecase(
        usuariosRepository,
        solicitacaoCpfCrmRepository,
        notificationService,
      ),
  ).scoped(),

  listarSolicitacoesCpfCrmUsecase: asFunction(
    ({ solicitacaoCpfCrmRepository }: AppContainer) =>
      new ListarSolicitacoesCpfCrmUsecase(solicitacaoCpfCrmRepository),
  ).scoped(),

  createExamUseCase: asFunction(
    ({ usuariosRepository, examesRepository, cryptographyService }: AppContainer) =>
      new CreateExamUseCase(usuariosRepository, examesRepository, cryptographyService),
  ).scoped(),

  uploadExamImagesUseCase: asFunction(
    ({ examesRepository, imagemRepository, storageService, messageBroker }: AppContainer) =>
      new UploadExamImagesUseCase(
        examesRepository,
        imagemRepository,
        storageService,
        messageBroker,
      ),
  ).scoped(),

  listExamsUseCase: asFunction(
    ({ examesRepository }: AppContainer) => new ListExamsUseCase(examesRepository),
  ).scoped(),

  registerExamAiResultUseCase: asFunction(
    ({ examesRepository, imagemRepository, resultadoIaRepository }: AppContainer) =>
      new RegisterExamAiResultUseCase(examesRepository, imagemRepository, resultadoIaRepository),
  ).scoped(),

  registerExamAiErrorUseCase: asFunction(
    ({ examesRepository, examIaErrorRepository }: AppContainer) =>
      new RegisterExamAiErrorUseCase(examesRepository, examIaErrorRepository),
  ).scoped(),
  listMyNotificationsUsecase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new ListMyNotificationsUsecase(notificationRepository),
  ).scoped(),
});

export function registerAppOnContainer(app: FastifyInstance): void {
  container.register({
    app: asValue(app),
  });
}
