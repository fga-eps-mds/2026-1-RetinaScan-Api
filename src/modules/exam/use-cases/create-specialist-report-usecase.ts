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
  html: string;
  conteudo: Record<string, unknown>;
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

  /**
   * Cria o laudo do especialista para um exame concluído e notifica o médico dono.
   * O exame só pode ter um laudo, e a criação é bloqueada se outro especialista estiver
   * editando o laudo no momento (lock de presença).
   *
   * @throws NotFoundError se o usuário ou o exame não existem
   * @throws UnauthorizedError se o ator não é um especialista
   * @throws ConflictError se o exame não está concluído, já possui laudo, ou está sendo editado por outro
   */
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

    if (examDetails.status !== 'CONCLUIDO')
      throw new ConflictError('Laudo do especialista só pode ser criado para exames concluídos');

    const existingReport = await this.specialistReportRepository.findByExamId(data.examId);

    if (existingReport) {
      throw new ConflictError('Este exame já possui laudo do especialista');
    }

    const editingPresence = await this.reportEditingPresenceService.get(data.examId);

    if (editingPresence && editingPresence.userId !== data.specialistId) {
      throw new ConflictError(
        `O laudo deste exame está sendo editado por ${editingPresence.nome}. Tente novamente mais tarde.`,
      );
    }

    const report = await this.specialistReportRepository.create({
      examId: data.examId,
      especialistId: data.specialistId,
      texto: data.texto,
      html: data.html,
      conteudo: data.conteudo,
      resultadoIaValido: data.resultadoIaValido,
    });

    await this.notificationService.notificar({
      usuarioId: examDetails.idUsuario,
      tipo: 'laudo_especialista_criado',
      titulo: 'Laudo de especialista disponível',
      mensagem: `O laudo do especialista para o seu exame ${examDetails.id} está disponível.`,
      chaveDedupe: `laudo_especialista_criado_${examDetails.id}`,
    });

    return {
      report,
      created: true,
    };
  }
}
