import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import type { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';

import {
  DrizzleSolicitacaoCpfCrmRepository,
  DrizzleUsuariosRepository,
  DrizzleExamesRepository,
  DrizzleImagemRepository,
  DrizzleResultadoIaRepository,
  DrizzleExamIaErrorRepository,
  DrizzleNotificationRepository,
  DrizzleComorbidadeRepository,
  DrizzleInscricaoMedicoRepository,
} from '@/infra/database/drizzle/repositories';

import { BetterAuthService } from '@/infra/auth/better-auth-service';
import { BullMQMessageBroker } from '@/infra/queue/notify-bullmq-service';
import { MinioStorageService } from '@/infra/storage/minio-storage-service';
import { NodeCryptoCryptographyService } from '@/infra/shared/node-cryptography-service';
import { DefaultMaskingService } from '@/infra/shared/default-masking-service';
import { DicomParserService } from '@/infra/dicom/dicom-parser-service';

import { CreateUserByAdmin } from '@/modules/users/use-cases/create-user-by-admin';
import { UpdateUserUsecase } from '@/modules/users/use-cases/update-user-usecase';
import { UpdateUserImageUsecase } from '@/modules/users/use-cases/update-user-image-usecase';
import { SolicitarAlteracaoCpfCrmUsecase } from '@/modules/users/use-cases/solicitar-alteracao-cpf-crm';
import { AprovarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/aprovar-solicitacao-cpf-crm';
import { RejeitarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/rejeitar-solicitacao-cpf-crm';
import { ListarSolicitacoesCpfCrmUsecase } from '@/modules/users/use-cases/listar-solicitacoes-cpf-crm';
import { RecoverPasswordByCrmUseCase } from '@/modules/users/use-cases/recover-password-by-crm-usecase';

import type { UsuariosRepository, SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import type { InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';

import { CreateExamUseCase } from '@/modules/exam/use-cases/create-exam-usecase';
import { ProcessExamUploadUseCase } from '@/modules/exam/use-cases/process-exam-upload-usecase';
import { ListExamsUseCase } from '@/modules/exam/use-cases/list-exams-usecase';
import { GetExamDetailsUseCase } from '@/modules/exam/use-cases/get-exam-details-usecase';
import { RegisterExamAiResultUseCase } from '@/modules/exam/use-cases/register-exam-ai-result-usecase';
import { RegisterExamAiErrorUseCase } from '@/modules/exam/use-cases/register-exam-ai-error-usecase';
import { CreateSpecialistReportUseCase } from '@/modules/exam/use-cases/create-specialist-report-usecase';
import { UpdateSpecialistReportUseCase } from '@/modules/exam/use-cases/update-specialist-report-usecase';
import { GeneratePdfReportUseCase } from '@/modules/exam/use-cases/generate-pdf-report-usecase';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import type { ExamIaErrorRepository } from '@/modules/exam/exam-ia-error-repository';
import type { ComorbidadeRepository } from '@/modules/exam/comorbidade-repository';
import type { SpecialistReportRepository } from '@/modules/exam/specialist-report-repository';

import type { AuthService } from '@/shared/services/auth-service';
import type { StorageService } from '@/shared/services/storage-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import type { DicomService } from '@/shared/services/dicom-service';
import type { MaskingService } from '@/shared/services/masking-service';
import type { MessageBroker } from '@/shared/services/message-broker';
import { AuthEmailMessageService, type IMessageService } from '@/shared/services/message-service';
import { GotenbergPdfService, type PdfService } from '@/shared/services/pdf-service';

import type { AuditLogsRepository } from '@/modules/audit-log/audit-log-repository';
import { ListLogsWithFiltersUseCase } from '@/modules/audit-log/use-case/list-logs-with-filters';

import type { NotificationsRepository } from '@/modules/notification/repositories';
import { NotificationService } from '@/modules/notification/services';
import { ListMyNotificationsUsecase } from '@/modules/notification/use-case/list-my-notifications-use-case';
import { DeleteNotificationUseCase } from '@/modules/notification/use-case/delete-notification-use-case';
import { MarkNotificationAsReadUseCase } from '@/modules/notification/use-case/mark-notification-as-read-use-case';

import { JoseInviteTokenService } from '@/infra/shared/jose-invite-token-service';
import { EnviarConvitesEmLoteUsecase } from '@/modules/users/use-cases/enviar-convites-em-lote-usecase';
import { SubmeterInscricaoUsecase } from '@/modules/users/use-cases/submeter-inscricao-usecase';
import { ListarInscricoesUsecase } from '@/modules/users/use-cases/listar-inscricoes-usecase';
import { AvaliarInscricaoUsecase } from '@/modules/users/use-cases/avaliar-inscricao-usecase';
import type { InviteTokenService } from '@/shared/services/invite-token-service';
import { NodemailerEmailProvider } from '../mail/providers/nodemailer-email-provider';
import { DrizzleAuditLogsRepository } from '../database/drizzle/repositories/drizzle-audit-logs-repository';
import { DrizzleSpecialistReportRepository } from '../database/drizzle/repositories/drizzle-specialist-report-repository';
import { RedisReportEditingPresenceService } from '../shared/redis-report-editing-presence-service';
import { redisClient } from '../cache/redis-client';

export interface AppContainer {
  app: FastifyInstance;
  redis: Redis;

  usuariosRepository: UsuariosRepository;
  solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository;
  inscricaoMedicoRepository: InscricaoMedicoRepository;
  notificationRepository: NotificationsRepository;
  examesRepository: ExamesRepository;
  imagemRepository: ImagemRepository;
  resultadoIaRepository: ResultadoIaRepository;
  examIaErrorRepository: ExamIaErrorRepository;
  comorbidadeRepository: ComorbidadeRepository;
  specialistReportRepository: SpecialistReportRepository;
  auditLogRepository: AuditLogsRepository;

  authService: AuthService;
  storageService: StorageService;
  dicomService: DicomService;
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
  recoverPasswordByCrmUseCase: RecoverPasswordByCrmUseCase;

  createExamUseCase: CreateExamUseCase;
  processExamUploadUseCase: ProcessExamUploadUseCase;
  listExamsUseCase: ListExamsUseCase;
  getExamDetailsUseCase: GetExamDetailsUseCase;
  registerExamAiResultUseCase: RegisterExamAiResultUseCase;
  registerExamAiErrorUseCase: RegisterExamAiErrorUseCase;
  createSpecialistReportUseCase: CreateSpecialistReportUseCase;
  updateSpecialistReportUseCase: UpdateSpecialistReportUseCase;

  notificationService: NotificationService;
  listMyNotificationsUsecase: ListMyNotificationsUsecase;
  deleteNotificationUseCase: DeleteNotificationUseCase;
  markNotificationAsReadUseCase: MarkNotificationAsReadUseCase;

  nodeMailerEmailProvider: NodemailerEmailProvider;
  inviteTokenService: InviteTokenService;
  enviarConvitesEmLoteUsecase: EnviarConvitesEmLoteUsecase;
  submeterInscricaoUsecase: SubmeterInscricaoUsecase;
  listarInscricoesUsecase: ListarInscricoesUsecase;
  avaliarInscricaoUsecase: AvaliarInscricaoUsecase;
  listLogsWithFiltersUseCase: ListLogsWithFiltersUseCase;
  authMessageService: IMessageService;
  reportEditingPresenceService: RedisReportEditingPresenceService;

  pdfService: PdfService;
  generatePdfReportUseCase: GeneratePdfReportUseCase;
}

export const container: AwilixContainer<AppContainer> = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  app: asValue({} as FastifyInstance),
  redis: asValue(redisClient),

  nodeMailerEmailProvider: asClass(NodemailerEmailProvider).singleton(),
  inviteTokenService: asClass(JoseInviteTokenService).singleton(),

  enviarConvitesEmLoteUsecase: asFunction(
    ({
      inscricaoMedicoRepository,
      usuariosRepository,
      inviteTokenService,
      messageBroker,
    }: AppContainer) =>
      new EnviarConvitesEmLoteUsecase(
        inscricaoMedicoRepository,
        usuariosRepository,
        inviteTokenService,
        messageBroker,
      ),
  ).scoped(),

  listarInscricoesUsecase: asFunction(
    ({ inscricaoMedicoRepository }: AppContainer) =>
      new ListarInscricoesUsecase(inscricaoMedicoRepository),
  ).scoped(),

  avaliarInscricaoUsecase: asFunction(
    ({ inscricaoMedicoRepository, cryptographyService }: AppContainer) =>
      new AvaliarInscricaoUsecase(inscricaoMedicoRepository, cryptographyService),
  ).scoped(),

  submeterInscricaoUsecase: asFunction(
    ({
      inscricaoMedicoRepository,
      usuariosRepository,
      inviteTokenService,
      cryptographyService,
    }: AppContainer) =>
      new SubmeterInscricaoUsecase(
        inscricaoMedicoRepository,
        usuariosRepository,
        inviteTokenService,
        cryptographyService,
      ),
  ).scoped(),

  usuariosRepository: asClass(DrizzleUsuariosRepository).singleton(),
  solicitacaoCpfCrmRepository: asClass(DrizzleSolicitacaoCpfCrmRepository).singleton(),
  notificationRepository: asClass(DrizzleNotificationRepository).singleton(),
  inscricaoMedicoRepository: asClass(DrizzleInscricaoMedicoRepository).singleton(),
  examesRepository: asClass(DrizzleExamesRepository).singleton(),
  imagemRepository: asClass(DrizzleImagemRepository).singleton(),
  resultadoIaRepository: asClass(DrizzleResultadoIaRepository).singleton(),
  examIaErrorRepository: asClass(DrizzleExamIaErrorRepository).singleton(),
  comorbidadeRepository: asClass(DrizzleComorbidadeRepository).singleton(),
  auditLogRepository: asClass(DrizzleAuditLogsRepository).singleton(),
  specialistReportRepository: asClass(DrizzleSpecialistReportRepository).singleton(),

  authService: asClass(BetterAuthService).singleton(),
  storageService: asClass(MinioStorageService).singleton(),
  dicomService: asClass(DicomParserService).singleton(),
  cryptographyService: asClass(NodeCryptoCryptographyService).singleton(),
  maskingService: asClass(DefaultMaskingService).singleton(),
  messageBroker: asClass(BullMQMessageBroker).singleton(),
  pdfService: asClass(GotenbergPdfService).singleton(),

  reportEditingPresenceService: asFunction(
    ({ redis }: AppContainer) => new RedisReportEditingPresenceService(redis),
  ).singleton(),

  authMessageService: asFunction(
    ({ nodeMailerEmailProvider }: AppContainer) =>
      new AuthEmailMessageService(nodeMailerEmailProvider),
  ).singleton(),

  markNotificationAsReadUseCase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new MarkNotificationAsReadUseCase(notificationRepository),
  ).scoped(),

  deleteNotificationUseCase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new DeleteNotificationUseCase(notificationRepository),
  ).scoped(),

  notificationService: asFunction(
    ({ app, notificationRepository, nodeMailerEmailProvider, usuariosRepository }: AppContainer) =>
      new NotificationService({
        app,
        notificationRepository,
        nodeMailerEmailProvider,
        usuarioRepository: usuariosRepository,
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

  recoverPasswordByCrmUseCase: asFunction(
    ({ usuariosRepository, maskingService }: AppContainer) =>
      new RecoverPasswordByCrmUseCase(usuariosRepository, maskingService),
  ).scoped(),

  createExamUseCase: asFunction(
    ({
      usuariosRepository,
      examesRepository,
      cryptographyService,
      imagemRepository,
      storageService,
      messageBroker,
    }: AppContainer) =>
      new CreateExamUseCase(
        usuariosRepository,
        examesRepository,
        cryptographyService,
        imagemRepository,
        storageService,
        messageBroker,
      ),
  ).scoped(),

  processExamUploadUseCase: asFunction(
    ({ storageService, dicomService }: AppContainer) =>
      new ProcessExamUploadUseCase(storageService, dicomService),
  ).scoped(),

  listExamsUseCase: asFunction(
    ({ examesRepository }: AppContainer) => new ListExamsUseCase(examesRepository),
  ).scoped(),

  getExamDetailsUseCase: asFunction(
    ({
      examesRepository,
      usuariosRepository,
      imagemRepository,
      resultadoIaRepository,
      comorbidadeRepository,
      storageService,
      cryptographyService,
      specialistReportRepository,
    }: AppContainer) =>
      new GetExamDetailsUseCase(
        examesRepository,
        usuariosRepository,
        imagemRepository,
        resultadoIaRepository,
        comorbidadeRepository,
        storageService,
        cryptographyService,
        specialistReportRepository,
      ),
  ).scoped(),

  registerExamAiResultUseCase: asFunction(
    ({
      examesRepository,
      imagemRepository,
      resultadoIaRepository,
      notificationService,
    }: AppContainer) =>
      new RegisterExamAiResultUseCase(
        examesRepository,
        imagemRepository,
        resultadoIaRepository,
        notificationService,
      ),
  ).scoped(),

  registerExamAiErrorUseCase: asFunction(
    ({ examesRepository, examIaErrorRepository, notificationService }: AppContainer) =>
      new RegisterExamAiErrorUseCase(examesRepository, examIaErrorRepository, notificationService),
  ).scoped(),

  listMyNotificationsUsecase: asFunction(
    ({ notificationRepository }: AppContainer) =>
      new ListMyNotificationsUsecase(notificationRepository),
  ).scoped(),

  listLogsWithFiltersUseCase: asFunction(
    ({ auditLogRepository }: AppContainer) => new ListLogsWithFiltersUseCase(auditLogRepository),
  ).scoped(),

  createSpecialistReportUseCase: asFunction(
    ({
      usuariosRepository,
      examesRepository,
      specialistReportRepository,
      notificationService,
      reportEditingPresenceService,
    }: AppContainer) =>
      new CreateSpecialistReportUseCase(
        usuariosRepository,
        examesRepository,
        specialistReportRepository,
        notificationService,
        reportEditingPresenceService,
      ),
  ).scoped(),

  updateSpecialistReportUseCase: asFunction(
    ({
      usuariosRepository,
      examesRepository,
      specialistReportRepository,
      notificationService,
    }: AppContainer) =>
      new UpdateSpecialistReportUseCase(
        usuariosRepository,
        examesRepository,
        specialistReportRepository,
        notificationService,
      ),
  ).scoped(),

  generatePdfReportUseCase: asFunction(
    ({ getExamDetailsUseCase, pdfService }: AppContainer) =>
      new GeneratePdfReportUseCase(getExamDetailsUseCase, pdfService),
  ).scoped(),
});

export function registerAppOnContainer(app: FastifyInstance): void {
  container.register({
    app: asValue(app),
  });
}
