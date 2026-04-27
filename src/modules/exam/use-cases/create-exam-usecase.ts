import type { UsuariosRepository } from '@/modules/users/repositories';
import { type Exame, ExameStatus, type ExamesRepository, type Sexo } from '@/modules/exam';
import { NotFoundError } from '@/shared/errors';
import { randomUUID } from 'node:crypto';
import type { CryptographyService, MaskingService } from '@/shared/services';

export type CreateExamUseCaseInput = {
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  comorbidades?: string;
  descricao?: string;
};

export type CreateExamUseCaseOutput = Exame;

export class CreateExamUseCase {
  constructor(
    private readonly userRepository: UsuariosRepository,
    private readonly examRepository: ExamesRepository,
    private readonly cryptographyService: CryptographyService,
    private readonly maskingService: MaskingService,
  ) {}

  async execute(input: CreateExamUseCaseInput): Promise<CreateExamUseCaseOutput> {
    await this.validateUserExists(input.idUsuario);

    const exam: Exame = this.anonimizeData({
      id: randomUUID(),
      idUsuario: input.idUsuario,
      nomeCompleto: input.nomeCompleto,
      cpf: input.cpf,
      sexo: input.sexo,
      dtNascimento: input.dtNascimento,
      dtHora: input.dtHora,
      status: ExameStatus.CRIADO,
      comorbidades: input.comorbidades,
      descricao: input.descricao,
    });

    return this.examRepository.create(exam);
  }

  private async validateUserExists(idUsuario: string) {
    const user = await this.userRepository.findBy({ id: idUsuario });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
  }

  private anonimizeData(exam: Exame): Exame {
    return {
      ...exam,
      nomeCompleto: this.maskingService.maskName(exam.nomeCompleto),
      cpf: this.maskingService.maskCpf(exam.cpf),
      dtNascimento: this.encrypt(exam.dtNascimento),
      comorbidades: exam.comorbidades ? this.encrypt(exam.comorbidades) : exam.comorbidades,
      descricao: exam.descricao ? this.encrypt(exam.descricao) : exam.descricao,
    };
  }

  private encrypt(text: string): string {
    return this.cryptographyService.encrypt({ text }).encryptedText;
  }
}
