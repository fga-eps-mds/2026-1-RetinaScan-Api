import { UsuariosRepository } from '@/modules/users/repositories';
import { ExamesRepository } from '../exam-repository';
import { Exame, ExameStatus } from '../exam';
import { PacientesRepository } from '@/modules/patient/patient-repository';
import { NotFoundError } from '@/shared/errors';
import { randomUUID } from 'node:crypto';

export type CreateExamUseCaseInput = {
  idUsuario: string;
  idPaciente: string;
  dtHora: Date;
  comorbidades?: string;
  descricao?: string;
};

export type CreateExamUseCaseOutput = Exame;

export class CreateExamUseCase {
  constructor(
    private readonly userRepository: UsuariosRepository,
    private readonly examRepository: ExamesRepository,
    private readonly patientRepository: PacientesRepository,
  ) {}

  async execute(input: CreateExamUseCaseInput): Promise<CreateExamUseCaseOutput> {
    await this.validateUserExists(input.idUsuario);
    await this.validatePatientExists(input.idPaciente);

    const exam = await this.examRepository.create({
      id: randomUUID(),
      idUsuario: input.idUsuario,
      idPaciente: input.idPaciente,
      dtHora: input.dtHora,
      status: ExameStatus.CRIADO,
      comorbidades: input.comorbidades,
      descricao: input.descricao,
    });

    return exam;
  }

  private async validateUserExists(idUsuario: string) {
    const user = await this.userRepository.findBy({ id: idUsuario });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
  }

  private async validatePatientExists(idPaciente: string) {
    const patient = await this.patientRepository.findBy({ id: idPaciente });

    if (!patient) {
      throw new NotFoundError('Paciente não encontrado');
    }
  }
}