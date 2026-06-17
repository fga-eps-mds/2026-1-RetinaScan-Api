import { and, asc, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@/infra/database/drizzle/connection';
import { solicitacaoCpfCrm, usuario } from '@/infra/database/drizzle/schema';
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
    const filters: SQL[] = [];

    if (input?.status) {
      filters.push(eq(solicitacaoCpfCrm.status, input.status));
    }

    if (input?.idUsuario) {
      filters.push(eq(solicitacaoCpfCrm.idUsuario, input.idUsuario));
    }

    const direction = input?.sortOrder === 'asc' ? asc : desc;

    if (!input?.relations) {
      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const orderBy =
        input?.sortBy === 'updatedAt'
          ? [direction(solicitacaoCpfCrm.updatedAt), desc(solicitacaoCpfCrm.createdAt)]
          : input?.sortBy === 'status'
            ? [direction(solicitacaoCpfCrm.status), desc(solicitacaoCpfCrm.createdAt)]
            : [direction(solicitacaoCpfCrm.createdAt)];

      return db
        .select()
        .from(solicitacaoCpfCrm)
        .where(whereClause)
        .orderBy(...orderBy) as Promise<SolicitacaoCpfCrm[]>;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (input?.nome) {
      filters.push(ilike(usuario.nomeCompleto, `%${input.nome}%`));
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (input?.email) {
      filters.push(ilike(usuario.email, `%${input.email}%`));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const orderBy =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      input?.sortBy === 'updatedAt'
        ? [direction(solicitacaoCpfCrm.updatedAt), desc(solicitacaoCpfCrm.createdAt)]
        : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          input?.sortBy === 'status'
          ? [direction(solicitacaoCpfCrm.status), desc(solicitacaoCpfCrm.createdAt)]
          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            input?.sortBy === 'nomeCompleto'
            ? [direction(usuario.nomeCompleto), desc(solicitacaoCpfCrm.createdAt)]
            : [direction(solicitacaoCpfCrm.createdAt)];

    const rows = await db
      .select({ solicitacao: solicitacaoCpfCrm, usuario })
      .from(solicitacaoCpfCrm)
      .innerJoin(usuario, eq(solicitacaoCpfCrm.idUsuario, usuario.id))
      .where(whereClause)
      .orderBy(...orderBy);

    return rows.map(({ solicitacao, usuario }) => ({
      ...solicitacao,
      usuario,
    })) as SolicitacaoCpfCrm[];
  }

  async deletar(idSolicitacao: string): Promise<SolicitacaoCpfCrm | null> {
    const solicitacao = await db
      .select()
      .from(solicitacaoCpfCrm)
      .where(eq(solicitacaoCpfCrm.id, idSolicitacao))
      .limit(1);

    if (solicitacao.length === 0) {
      return null;
    }

    if (solicitacao[0].status === solicitacaoStatus.PENDENTE) {
      throw new Error(
        'Não é permitido deletar uma solicitação pendente. Por favor, recuse ou aceite a solicitação para removê-la.',
      );
    }

    const result = await db
      .delete(solicitacaoCpfCrm)
      .where(eq(solicitacaoCpfCrm.id, idSolicitacao))
      .returning();

    return (result[0] as SolicitacaoCpfCrm | undefined) ?? null;
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
