import type { UsuariosRepository } from '@/modules/users/repositories';
import { type Exame, ExameStatus, type ExamesRepository, type Sexo } from '@/modules/exam';
import { NotFoundError } from '@/shared/errors';
import { randomUUID } from 'node:crypto';
import type { CryptographyService } from '@/shared/services';

export type ExamComorbidadesInput = {
  diabetes: boolean;
  diabetesAnos?: number;
  diabetesUsoInsulina: boolean;
  diabetesControlado: boolean;

  hipertensao: boolean;
  hipertensaoControlada: boolean;

  altaMiopia: boolean;
  glaucoma: boolean;
  usoHidroxicloroquina: boolean;
  uveite: boolean;
  catarata: boolean;

  outrasComorbidades: boolean;
  outrasComorbidadesDescricao?: string;

  qualidadeTecnicaDificuldade: boolean;
};

export type CreateExamUseCaseInput = {
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  comorbidades: ExamComorbidadesInput;
  descricao?: string;
};

export type CreateExamUseCaseOutput = Exame;

export class CreateExamUseCase {
  constructor(
    private readonly userRepository: UsuariosRepository,
    private readonly examRepository: ExamesRepository,
    private readonly cryptographyService: CryptographyService,
  ) {}

  async execute(input: CreateExamUseCaseInput): Promise<CreateExamUseCaseOutput> {
    await this.validateUserExists(input.idUsuario);

    const examId = randomUUID();

    const exam: Exame = this.anonimizeExamData({
      id: examId,
      idUsuario: input.idUsuario,
      nomeCompleto: input.nomeCompleto,
      cpf: input.cpf,
      sexo: input.sexo,
      dtNascimento: input.dtNascimento,
      dtHora: input.dtHora,
      status: ExameStatus.CRIADO,
      descricao: input.descricao,
    });

    const comorbidades = this.anonimizeComorbidadesData({
      idExame: examId,
      ...input.comorbidades,
    });

    return this.examRepository.createWithComorbidity({
      exam,
      comorbidades,
    });
  }

  private async validateUserExists(idUsuario: string) {
    const user = await this.userRepository.findBy({ id: idUsuario });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
  }

  private anonimizeExamData(exam: Exame): Exame {
    return {
      ...exam,
      dtNascimento: this.encrypt(exam.dtNascimento),
      descricao: exam.descricao ? this.encrypt(exam.descricao) : exam.descricao,
    };
  }

  private anonimizeComorbidadesData(comorbidades: { idExame: string } & ExamComorbidadesInput) {
    return {
      ...comorbidades,
      outrasComorbidadesDescricao: comorbidades.outrasComorbidadesDescricao
        ? this.encrypt(comorbidades.outrasComorbidadesDescricao)
        : comorbidades.outrasComorbidadesDescricao,
    };
  }

  private encrypt(text: string): string {
    return this.cryptographyService.encrypt({ text }).encryptedText;
  }
}
