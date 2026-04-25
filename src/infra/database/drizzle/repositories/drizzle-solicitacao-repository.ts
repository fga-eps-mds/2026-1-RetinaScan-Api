import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@/infra/database/drizzle/connection';
import { solicitacaoCpfCrm } from '@/infra/database/drizzle/schema';
import { solicitacaoStatus, type SolicitacaoCpfCrm } from '@/modules/users/domain';
import type {
  AprovarSolicitacaoCpfCrmInput,
  ListarSolicitacoesCpfCrmInput,
  RejeitarSolicitacaoCpfCrmInput,
  SolicitacaoCpfCrmRepository,
  SolicitarAlteracaoCpfCrmInput,
} from '@/modules/users/repositories';

export class DrizzleSolicitacaoCpfCrmRepository implements SolicitacaoCpfCrmRepository {
  async criar(input: SolicitarAlteracaoCpfCrmInput): Promise<SolicitacaoCpfCrm> {
    const result = await db
      .insert(solicitacaoCpfCrm)
      .values({
        id: randomUUID(),
        idUsuario: input.idUsuario,
        cpfNovo: input.cpfNovo,
        crmNovo: input.crmNovo,
        status: solicitacaoStatus.PENDENTE,
      })
      .returning();

    return result[0] as SolicitacaoCpfCrm;
  }

  async findPendenteByUsuario(idUsuario: string): Promise<SolicitacaoCpfCrm | null> {
    const result = await db
      .select()
      .from(solicitacaoCpfCrm)
      .where(
        and(
          eq(solicitacaoCpfCrm.idUsuario, idUsuario),
          eq(solicitacaoCpfCrm.status, solicitacaoStatus.PENDENTE),
        ),
      )
      .limit(1);

    return (result[0] as SolicitacaoCpfCrm | undefined) ?? null;
  }

  async listar(input?: ListarSolicitacoesCpfCrmInput): Promise<SolicitacaoCpfCrm[]> {
    const filters = [];

    if (input?.status) {
      filters.push(eq(solicitacaoCpfCrm.status, input.status));
    }

    if (input?.idUsuario) {
      filters.push(eq(solicitacaoCpfCrm.idUsuario, input.idUsuario));
    }

    if (filters.length === 0) {
      return (await db
        .select()
        .from(solicitacaoCpfCrm)
        .orderBy(solicitacaoCpfCrm.createdAt)) as SolicitacaoCpfCrm[];
    }

    return (await db
      .select()
      .from(solicitacaoCpfCrm)
      .where(and(...filters))
      .orderBy(solicitacaoCpfCrm.createdAt)) as SolicitacaoCpfCrm[];
  }

  async aprovar(input: AprovarSolicitacaoCpfCrmInput): Promise<SolicitacaoCpfCrm | null> {
    const result = await db
      .update(solicitacaoCpfCrm)
      .set({
        status: solicitacaoStatus.APROVADA,
        motivoRejeicao: null,
        analisadoPor: input.analisadoPor,
        analisadoEm: new Date(),
      })
      .where(eq(solicitacaoCpfCrm.id, input.idSolicitacao))
      .returning();

    return (result[0] as SolicitacaoCpfCrm | undefined) ?? null;
  }

  async rejeitar(input: RejeitarSolicitacaoCpfCrmInput): Promise<SolicitacaoCpfCrm | null> {
    const result = await db
      .update(solicitacaoCpfCrm)
      .set({
        status: solicitacaoStatus.REJEITADA,
        motivoRejeicao: input.motivoRejeicao,
        analisadoPor: input.analisadoPor,
        analisadoEm: new Date(),
      })
      .where(eq(solicitacaoCpfCrm.id, input.idSolicitacao))
      .returning();

    return (result[0] as SolicitacaoCpfCrm | undefined) ?? null;
  }
}
