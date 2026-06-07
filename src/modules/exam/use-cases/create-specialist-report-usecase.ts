import type { UsuariosRepository } from '@/modules/users/repositories';
import type { SpecialistReport } from '../specialist-report';
import type { ExamesRepository } from '../exam-repository';
import type { SpecialistReportRepository } from '../specialist-report-repository';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import type { NotificationService } from '@/modules/notification/services';
import type { ReportEditingPresenceService } from '@/shared/services/report-edit-lock-service';

type createSpecialistUseCaseRequest = {
  examId: string;
  specialistId: string;
  texto: string;
  resultadoIaValido: boolean;
};

type createSpecialistUseCaseResponse = {
  report: SpecialistReport;
  created: boolean;
};

export class CreateSpecialistReportUseCase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly examesRepository: ExamesRepository,
    private readonly specialistReportRepository: SpecialistReportRepository,
    private readonly notificationService: NotificationService,
    private readonly reportEditingPresenceService: ReportEditingPresenceService,
  ) {}

  async execute(data: createSpecialistUseCaseRequest): Promise<createSpecialistUseCaseResponse> {
    const actor = await this.usuariosRepository.findBy({
      id: data.specialistId,
    });

    if (!actor) throw new NotFoundError('Usuário não encontrado');

    if (!['ESPECIALISTA'].includes(actor.tipoPerfil))
      throw new UnauthorizedError('Usuário não é um especialista');

    const examDetails = await this.examesRepository.findOne({
      examId: data.examId,
    });
    if (!examDetails) throw new NotFoundError('Exame não encontrado');

    const existingReport = await this.specialistReportRepository.findByExamId(data.examId);

    if (existingReport) {
      throw new ConflictError('Este exame já possui laudo do especialista');
    }

    const editingPresence = await this.reportEditingPresenceService.get(data.examId);

    if (editingPresence) {
      throw new ConflictError(
        `O laudo deste exame está sendo editado por ${editingPresence.nome}. Tente novamente mais tarde.`,
      );
    }

    const report = await this.specialistReportRepository.create({
      examId: data.examId,
      especialistId: data.specialistId,
      texto: data.texto,
      resultadoIaValido: data.resultadoIaValido,
    });

    await this.notificationService.notificar({
      usuarioId: examDetails.idUsuario,
      tipo: 'laudo_especialista_criado',
      titulo: 'Laudo de especialista disponível',
      mensagem: 'O laudo do especialista para o seu exame está disponível.',
      chaveDedupe: `laudo_especialista_criado_${examDetails.id}`,
    });

    return {
      report,
      created: true,
    };
  }
}
