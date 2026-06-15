import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors';
import type { ExamesRepository } from '@/modules/exam';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { ExamShareRepository } from '../exam-share-repository';
import type { ExamShare } from '../exam-share';

export type ShareExamUseCaseInput = {
  examId: string;
  emailDestino?: string;
  compartilhadoPorId: string;
  expiraEm?: Date | null;
};

export class ShareExamUseCase {
  constructor(
    private readonly examRepository: ExamesRepository,
    private readonly userRepository: UsuariosRepository,
    private readonly examShareRepository: ExamShareRepository,
  ) {}

  async execute(input: ShareExamUseCaseInput): Promise<ExamShare> {
    const especialista = await this.userRepository.findBy({ id: input.compartilhadoPorId });
    if (!especialista) {
      throw new NotFoundError('Usuário que está tentando compartilhar não foi encontrado.');
    }
    if (especialista.tipoPerfil !== 'ESPECIALISTA') {
      throw new UnauthorizedError(
        'Apenas usuários do tipo ESPECIALISTA podem compartilhar exames.',
      );
    }

    const exam = await this.examRepository.findOne({ examId: input.examId });
    if (!exam) {
      throw new NotFoundError('Exame não encontrado.');
    }

    if (!input.emailDestino) {
      throw new Error('É necessário informar o E-mail ou CRM do médico destino.');
    }

    const medicoDestino = await this.userRepository.findByEmail(input.emailDestino);
    if (!medicoDestino) {
      throw new NotFoundError(
        'Médico destino não encontrado na plataforma. Verifique os dados informados.',
      );
    }
    if (medicoDestino.tipoPerfil !== 'MEDICO') {
      throw new UnauthorizedError(
        'Só é possível compartilhar laudos com usuários do perfil MÉDICO.',
      );
    }

    if (medicoDestino.id === exam.idUsuario) {
      throw new ConflictError('Este médico é o próprio criador do exame. Ele já possui acesso.');
    }

    if (input.expiraEm) {
      const agora = new Date();
      if (input.expiraEm <= agora) {
        throw new ConflictError('A data de expiração não pode estar no passado.');
      }
    }

    const existingShare = await this.examShareRepository.findByExamAndMedico(
      input.examId,
      medicoDestino.id,
    );
    if (existingShare && existingShare.ativo) {
      const agora = new Date();
      if (!existingShare.expiraEm || existingShare.expiraEm > agora) {
        throw new ConflictError('Este exame já está compartilhado ativamente com este médico.');
      }
    }

    const newShare = await this.examShareRepository.create({
      examId: input.examId,
      medicoDestinoId: medicoDestino.id,
      compartilhadoPor: especialista.id,
      expiraEm: input.expiraEm,
    });

    return newShare;
  }
}
