import type { CriarNotificacaoDTO, Notificacao } from '@/modules/notification/domain';
import type {
  ListarNotificacoesPorUsuarioParams,
  NotificationsRepository,
} from '@/modules/notification/repositories';
import { db } from '../connection';
import { notificacao } from '../schema';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

export class DrizzleNotificationRepository implements NotificationsRepository {
  async criar(input: CriarNotificacaoDTO): Promise<Notificacao> {
    const [notificacaoCriada] = await db
      .insert(notificacao)
      .values({
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        dados: input.dados ?? null,
        chaveDedupe: input.chaveDedupe,
      })
      .returning();

    return notificacaoCriada;
  }

  async buscarPorChave(chaveDedupe: string): Promise<Notificacao | null> {
    const [notificacoes] = await db
      .select()
      .from(notificacao)
      .where(eq(notificacao.chaveDedupe, chaveDedupe))
      .limit(1);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return notificacoes ?? null;
  }

  async listarPorUsuario({
    usuarioId,
    limit = 20,
    status = 'todas',
    tipo,
  }: ListarNotificacoesPorUsuarioParams): Promise<Notificacao[]> {
    const filters = [eq(notificacao.usuarioId, usuarioId)];

    if (status === 'nao-lidas') {
      filters.push(isNull(notificacao.lidaEm));
    }

    if (status === 'lidas') {
      filters.push(isNotNull(notificacao.lidaEm));
    }

    if (tipo) {
      filters.push(eq(notificacao.tipo, tipo));
    }

    return db
      .select()
      .from(notificacao)
      .where(and(...filters))
      .orderBy(desc(notificacao.createdAt))
      .limit(limit);
  }

  async marcarComoLida({
    notificacaoId,
    usuarioId,
  }: {
    notificacaoId: string;
    usuarioId: string;
  }): Promise<boolean> {
    const result = await db
      .update(notificacao)
      .set({
        lidaEm: new Date(),
      })
      .where(and(eq(notificacao.id, notificacaoId), eq(notificacao.usuarioId, usuarioId)))
      .returning({ id: notificacao.id });

    return result.length > 0;
  }

  async marcarTodasComoLidas(usuarioId: string): Promise<void> {
    await db
      .update(notificacao)
      .set({ lidaEm: new Date(), updatedAt: new Date() })
      .where(and(eq(notificacao.usuarioId, usuarioId), isNull(notificacao.lidaEm)));
  }

  async marcarEnviadaEmTempoReal(notificacaoId: string): Promise<void> {
    await db
      .update(notificacao)
      .set({
        enviadaEmTempoRealEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificacao.id, notificacaoId));
  }

  async marcarEnviadaPorEmail(notificacaoId: string): Promise<void> {
    await db
      .update(notificacao)
      .set({
        enviadaPorEmailEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificacao.id, notificacaoId));
  }

  async deletar(notificacaoId: string, usuarioId: string): Promise<boolean> {
    const result = await db
      .delete(notificacao)
      .where(and(eq(notificacao.id, notificacaoId), eq(notificacao.usuarioId, usuarioId)))
      .returning({ id: notificacao.id });

    return result.length > 0;
  }
}
