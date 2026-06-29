import type {
  InscricaoMedicoRepository,
  ListarInscricoesInput,
} from '@/modules/users/repositories/users-repository';
import type { InscricaoStatus } from '@/modules/users/domain';

export type ListarInscricoesUseCaseInput = {
  status?: InscricaoStatus;
};

export type InscricaoListItem = Omit<
  Awaited<ReturnType<InscricaoMedicoRepository['listar']>>[number],
  'encryptedPassword'
>;

export class ListarInscricoesUsecase {
  constructor(private readonly inscricaoRepo: InscricaoMedicoRepository) {}

  /**
   * Lista inscrições de médicos, opcionalmente filtrando por status, removendo o
   * `encryptedPassword` de cada item antes de retornar.
   */
  async execute(input: ListarInscricoesUseCaseInput): Promise<InscricaoListItem[]> {
    const filtros: ListarInscricoesInput = {};
    if (input.status) filtros.status = input.status;

    const inscricoes = await this.inscricaoRepo.listar(filtros);

    return inscricoes.map(({ encryptedPassword: _omit, ...rest }) => rest);
  }
}
