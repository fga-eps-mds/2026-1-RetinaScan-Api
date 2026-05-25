import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';

import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { notificacao, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleNotificationRepository } from '@/infra/database/drizzle/repositories/drizzle-notification-repository';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

describe('DrizzleNotificationRepository (integration)', () => {
  const repository = new DrizzleNotificationRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${notificacao} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  describe('marcarComoLida', () => {
    it('should mark notification as read and return true', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const [created] = await db
        .insert(notificacao)
        .values({
          id: randomUUID(),
          usuarioId: user.id,
          tipo: 'avaliacao_ia_atualizada',
          titulo: 'Avaliação concluída',
          mensagem: 'Seu exame foi processado.',
          dados: null,
          chaveDedupe: `dedupe:${randomUUID()}`,
          lidaEm: null,
          enviadaEmTempoRealEm: null,
          enviadaPorEmailEm: null,
        })
        .returning();

      const result = await repository.marcarComoLida({
        notificacaoId: created.id,
        usuarioId: user.id,
      });

      expect(result).toBe(true);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.lidaEm).toBeInstanceOf(Date);
    });

    it('should return false when notification does not exist', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const result = await repository.marcarComoLida({
        notificacaoId: randomUUID(),
        usuarioId: user.id,
      });

      expect(result).toBe(false);
    });

    it('should return false when notification belongs to another user', async () => {
      const owner = await UsuarioBuilder.anUser().build();
      const otherUser = await UsuarioBuilder.anUser().build();

      const [created] = await db
        .insert(notificacao)
        .values({
          id: randomUUID(),
          usuarioId: owner.id,
          tipo: 'avaliacao_ia_atualizada',
          titulo: 'Avaliação concluída',
          mensagem: 'Seu exame foi processado.',
          dados: null,
          chaveDedupe: `dedupe:${randomUUID()}`,
          lidaEm: null,
          enviadaEmTempoRealEm: null,
          enviadaPorEmailEm: null,
        })
        .returning();

      const result = await repository.marcarComoLida({
        notificacaoId: created.id,
        usuarioId: otherUser.id,
      });

      expect(result).toBe(false);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.lidaEm).toBeNull();
    });
  });

  describe('deletar', () => {
    it('should delete notification and return true', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const [created] = await db
        .insert(notificacao)
        .values({
          id: randomUUID(),
          usuarioId: user.id,
          tipo: 'avaliacao_ia_atualizada',
          titulo: 'Avaliação concluída',
          mensagem: 'Seu exame foi processado.',
          dados: null,
          chaveDedupe: `dedupe:${randomUUID()}`,
          lidaEm: null,
          enviadaEmTempoRealEm: null,
          enviadaPorEmailEm: null,
        })
        .returning();

      const result = await repository.deletar(created.id, user.id);

      expect(result).toBe(true);

      const rows = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(rows).toHaveLength(0);
    });

    it('should return false when notification is not found', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const result = await repository.deletar(randomUUID(), user.id);

      expect(result).toBe(false);
    });
  });
});
