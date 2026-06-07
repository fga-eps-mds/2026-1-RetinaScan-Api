import type { UsuariosRepository } from '@/modules/users/repositories';
import type { ExamesRepository } from '../exam-repository';
import type { SpecialistReportRepository } from '../specialist-report-repository';
import type { NotificationService } from '@/modules/notification/services';
import type { SpecialistReport } from '../specialist-report';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import { env } from '@/env';

type UpdateSpecialistReportUseCaseRequest = {
  actorId: string;
  examId: string;
  texto: string;
  html: string;
  conteudo: Record<string, unknown>;
  resultadoIaValido: boolean;
};

type UpdateSpecialistReportUseCaseResponse = {
  report: SpecialistReport;
  updated: boolean;
};

export class UpdateSpecialistReportUseCase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly examesRepository: ExamesRepository,
    private readonly specialistReportRepository: SpecialistReportRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(
    data: UpdateSpecialistReportUseCaseRequest,
  ): Promise<UpdateSpecialistReportUseCaseResponse> {
    const actor = await this.usuariosRepository.findBy({ id: data.actorId });

    if (!actor) throw new NotFoundError('Usuário não encontrado');

    const examDetails = await this.examesRepository.findOne({
      examId: data.examId,
    });
    if (!examDetails) throw new NotFoundError('Exame não encontrado');

    if (examDetails.status !== 'CONCLUIDO')
      throw new ConflictError('Exame não encontrado ou ainda não concluído');

    const existingReport = await this.specialistReportRepository.findByExamId(data.examId);

    if (!existingReport) {
      throw new NotFoundError('Laudo do especialista não encontrado para este exame');
    }

    if (actor.id !== existingReport.specialistId) {
      throw new UnauthorizedError('Você não pode atualizar o laudo de outro especialista');
    }

    const deadline = new Date(existingReport.createdAt);
    deadline.setHours(deadline.getHours() + env.SPECIALIST_REPORT_EDIT_WINDOW_DAYS);

    if (new Date() > deadline) {
      throw new UnauthorizedError('O prazo para editar este laudo expirou');
    }

    const report = await this.specialistReportRepository.update(existingReport.id, {
      texto: data.texto,
      resultadoIaValido: data.resultadoIaValido,
      html: data.html,
      conteudo: data.conteudo,
    });

    await this.notificationService.notificar({
      usuarioId: examDetails.idUsuario,
      tipo: 'laudo_especialista_atualizado',
      titulo: 'Laudo de especialista atualizado',
      mensagem: `O laudo do especialista para o seu exame "${examDetails.id}" foi atualizado.`,
      chaveDedupe: `laudo_atualizado_${examDetails.id}`,
    });

    return {
      report,
      updated: true,
    };
  }
}
