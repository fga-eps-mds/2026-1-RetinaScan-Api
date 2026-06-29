import type { Comorbidade, ExameStatus, OlhoExame, Sexo, Exame } from '@/modules/exam/exam';
import type { LateralidadeOlho, Imagem } from '@/modules/exam/imagem';
import type { Probabilities, ResultadoIa } from '@/modules/exam/resultado-ia';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import type { ComorbidadeRepository } from '@/modules/exam/comorbidade-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { tiposPerfil, type TipoPerfil } from '@/modules/users/domain';
import { Buckets, type StorageService } from '@/shared/services/storage-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';
import type { SpecialistReportRepository } from '../specialist-report-repository';
import type { SpecialistReport } from '../specialist-report';
import type { ExamShareRepository } from '../exam-share-repository';

const PRESIGNED_URL_TTL_SECONDS = 900;

export type GetExamDetailsRequester = {
  id: string;
  tipoPerfil: TipoPerfil;
};

export type GetExamDetailsUseCaseInput = {
  examId: string;
  requester: GetExamDetailsRequester;
};

export type GetExamDetailsResultadoIaDto = {
  id: string;
  predictedClass: number;
  predictedLabel: string;
  confidence: number;
  probabilities: Probabilities;
};

export type GetExamDetailsImagemDto = {
  id: string;
  lateralidadeOlho: LateralidadeOlho;
  url: string;
  qualidadeImg: string;
  resultadoIa: GetExamDetailsResultadoIaDto | null;
};

export type GetExamDetailsMedicoDto = {
  id: string;
  nomeCompleto: string;
};

export type GetExamDetailsComorbidadesDto = {
  diabetes: boolean;
  diabetesAnos: number | null;
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
  outrasComorbidadesDescricao: string | null;
  qualidadeTecnicaDificuldade: boolean;
};

export type GetExamDetailsUseCaseOutput = {
  id: string;
  status: ExameStatus;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  olho: OlhoExame | null;
  comorbidades: GetExamDetailsComorbidadesDto | null;
  descricao: string | null;
  medico: GetExamDetailsMedicoDto;
  imagens: GetExamDetailsImagemDto[];
  laudoEspecialista: SpecialistReport | null;
};

function toComorbidadesDto(comorbidade: Comorbidade): GetExamDetailsComorbidadesDto {
  return {
    diabetes: comorbidade.diabetes,
    diabetesAnos: comorbidade.diabetesAnos ?? null,
    diabetesUsoInsulina: comorbidade.diabetesUsoInsulina,
    diabetesControlado: comorbidade.diabetesControlado,
    hipertensao: comorbidade.hipertensao,
    hipertensaoControlada: comorbidade.hipertensaoControlada,
    altaMiopia: comorbidade.altaMiopia,
    glaucoma: comorbidade.glaucoma,
    usoHidroxicloroquina: comorbidade.usoHidroxicloroquina,
    uveite: comorbidade.uveite,
    catarata: comorbidade.catarata,
    outrasComorbidades: comorbidade.outrasComorbidades,
    outrasComorbidadesDescricao: comorbidade.outrasComorbidadesDescricao ?? null,
    qualidadeTecnicaDificuldade: comorbidade.qualidadeTecnicaDificuldade,
  };
}

function toResultadoDto(resultado: ResultadoIa): GetExamDetailsResultadoIaDto {
  return {
    id: resultado.id,
    predictedClass: resultado.predictedClass,
    predictedLabel: resultado.predictedLabel,
    confidence: resultado.confidence,
    probabilities: resultado.probabilities,
  };
}

export class GetExamDetailsUseCase {
  constructor(
    private readonly examesRepository: ExamesRepository,
    private readonly usuariosRepository: UsuariosRepository,
    private readonly imagemRepository: ImagemRepository,
    private readonly resultadoIaRepository: ResultadoIaRepository,
    private readonly comorbidadeRepository: ComorbidadeRepository,
    private readonly storageService: StorageService,
    private readonly cryptographyService: CryptographyService,
    private readonly specialistReportRepository: SpecialistReportRepository,
    private readonly examShareRepository?: ExamShareRepository,
  ) {}

  /**
   * Monta os detalhes completos do exame: dados do paciente (com campos sensíveis
   * descriptografados), médico, imagens com URLs assinadas e laudo do especialista.
   * Resultados de IA só entram quando o exame está `CONCLUIDO`. Um `MEDICO` só acessa
   * os próprios exames; demais perfis acessam qualquer um.
   *
   * @throws NotFoundError se o exame ou o médico responsável não existem
   * @throws UnauthorizedError se um médico tenta acessar exame de outro usuário
   */
  async execute(input: GetExamDetailsUseCaseInput): Promise<GetExamDetailsUseCaseOutput> {
    const exame = await this.getExam(input.examId);
    await this.assertCanView(exame, input.requester);

    const medico = await this.getMedico(exame.idUsuario);
    const imagens = await this.imagemRepository.findMany({ examId: exame.id });
    const resultadosByImagem = await this.getResultadosByImagem(exame);
    const imagensDto = await this.buildImagensDto(imagens, resultadosByImagem);
    const comorbidade = await this.comorbidadeRepository.findByExamId({ examId: exame.id });
    const laudoEspecialista = await this.specialistReportRepository.findByExamId(exame.id);

    return this.toOutput(exame, medico, imagensDto, comorbidade, laudoEspecialista);
  }

  private async getExam(examId: string): Promise<Exame> {
    const exame = await this.examesRepository.findOne({ examId });
    if (!exame) {
      throw new NotFoundError('Exame não encontrado.');
    }
    return exame;
  }

  private async assertCanView(exame: Exame, requester: GetExamDetailsRequester): Promise<void> {
    if (requester.tipoPerfil === tiposPerfil.MEDICO && exame.idUsuario !== requester.id) {
      if (this.examShareRepository) {
        const share = await this.examShareRepository.findByExamAndMedico(exame.id, requester.id);
        if (share && share.ativo) {
          const agora = new Date();
          if (!share.expiraEm || share.expiraEm > agora) {
            return;
          }
        }
      }
      throw new UnauthorizedError('Acesso negado a este exame.');
    }
  }

  private async getMedico(idUsuario: string): Promise<GetExamDetailsMedicoDto> {
    const medico = await this.usuariosRepository.findBy({ id: idUsuario });
    if (!medico) {
      throw new NotFoundError('Médico responsável pelo exame não encontrado.');
    }
    return { id: medico.id, nomeCompleto: medico.nomeCompleto };
  }

  private async getResultadosByImagem(exame: Exame): Promise<Map<string, ResultadoIa>> {
    if (exame.status !== 'CONCLUIDO') {
      return new Map();
    }
    const resultados = await this.resultadoIaRepository.findByExamId({ examId: exame.id });
    return new Map(resultados.map((r) => [r.idImagem, r]));
  }

  private async buildImagensDto(
    imagens: Imagem[],
    resultadosByImagem: Map<string, ResultadoIa>,
  ): Promise<GetExamDetailsImagemDto[]> {
    return Promise.all(
      imagens.map(async (img) => {
        const url = await this.storageService.getPresignedUrl({
          key: img.caminhoImg,
          bucket: Buckets.examImages,
          expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
        });
        const resultado = resultadosByImagem.get(img.id) ?? null;
        return {
          id: img.id,
          lateralidadeOlho: img.lateralidadeOlho,
          url,
          qualidadeImg: img.qualidadeImg,
          resultadoIa: resultado ? toResultadoDto(resultado) : null,
        };
      }),
    );
  }

  private toOutput(
    exame: Exame,
    medico: GetExamDetailsMedicoDto,
    imagens: GetExamDetailsImagemDto[],
    comorbidade: Comorbidade | null,
    laudoEspecialista: SpecialistReport | null,
  ): GetExamDetailsUseCaseOutput {
    return {
      id: exame.id,
      status: exame.status,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: this.decrypt(exame.dtNascimento),
      dtHora: exame.dtHora,
      olho: exame.olho ?? null,
      comorbidades: comorbidade ? toComorbidadesDto(comorbidade) : null,
      descricao: exame.descricao ? this.decrypt(exame.descricao) : null,
      medico,
      imagens,
      laudoEspecialista,
    };
  }

  private decrypt(encryptedText: string): string {
    return this.cryptographyService.decrypt({ encryptedText }).text;
  }
}
