import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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

  describe('criar', () => {
    it('should persist the notification and return the stored data', async () => {
      const user = await UsuarioBuilder.anUser().build();
      const chaveDedupe = `dedupe:${randomUUID()}`;

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Avaliação concluída',
        mensagem: 'Seu exame foi processado.',
        dados: { exameId: randomUUID() },
        chaveDedupe,
      });

      expect(created.usuarioId).toBe(user.id);
      expect(created.tipo).toBe('avaliacao_ia_atualizada');
      expect(created.chaveDedupe).toBe(chaveDedupe);
      expect(created.lidaEm).toBeNull();

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.usuarioId).toBe(user.id);
      expect(row.tipo).toBe('avaliacao_ia_atualizada');
      expect(row.chaveDedupe).toBe(chaveDedupe);
      expect(row.dados).toEqual({ exameId: expect.any(String) });
    });

    it('should persist nullable dados as null when not provided', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'exame_criado',
        titulo: 'Novo exame',
        mensagem: 'Um novo exame foi criado.',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      expect(created.dados).toBeNull();

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.dados).toBeNull();
    });
  });

  describe('buscarPorChave', () => {
    it('should return the notification by dedupe key', async () => {
      const user = await UsuarioBuilder.anUser().build();
      const chaveDedupe = `dedupe:${randomUUID()}`;

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Avaliação concluída',
        mensagem: 'Seu exame foi processado.',
        chaveDedupe,
      });

      const found = await repository.buscarPorChave(chaveDedupe);

      expect(found?.id).toBe(created.id);
      expect(found?.chaveDedupe).toBe(chaveDedupe);
    });

    it('should return null when dedupe key does not exist', async () => {
      const found = await repository.buscarPorChave(`dedupe:${randomUUID()}`);
      expect(found).toBeNull();
    });
  });

  describe('listarPorUsuario', () => {
    it('should return only notifications from the provided usuarioId', async () => {
      const user = await UsuarioBuilder.anUser().build();
      const otherUser = await UsuarioBuilder.anUser().build();

      await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });
      await repository.criar({
        usuarioId: user.id,
        tipo: 'exame_criado',
        titulo: 'B',
        mensagem: 'B',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });
      await repository.criar({
        usuarioId: otherUser.id,
        tipo: 'exame_criado',
        titulo: 'C',
        mensagem: 'C',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const result = await repository.listarPorUsuario({
        usuarioId: user.id,
        limit: 10,
        status: 'todas',
      });

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.usuarioId === user.id)).toBe(true);
    });

    it('should filter unread notifications', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const unread = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Lida não',
        mensagem: 'Mensagem',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const read = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Lida sim',
        mensagem: 'Mensagem',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      await repository.marcarComoLida({
        notificacaoId: read.id,
        usuarioId: user.id,
      });

      const result = await repository.listarPorUsuario({
        usuarioId: user.id,
        status: 'nao-lidas',
        limit: 10,
      });

      expect(result.map((item) => item.id)).toEqual([unread.id]);
    });

    it('should filter read notifications', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const unread = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Lida não',
        mensagem: 'Mensagem',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const read = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Lida sim',
        mensagem: 'Mensagem',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      await repository.marcarComoLida({
        notificacaoId: read.id,
        usuarioId: user.id,
      });

      const result = await repository.listarPorUsuario({
        usuarioId: user.id,
        status: 'lidas',
        limit: 10,
      });

      expect(result.map((item) => item.id)).toEqual([read.id]);
      expect(result.find((item) => item.id === unread.id)).toBeUndefined();
    });

    it('should filter by tipo and respect limit', async () => {
      const user = await UsuarioBuilder.anUser().build();

      await repository.criar({
        usuarioId: user.id,
        tipo: 'tipo-a',
        titulo: 'A1',
        mensagem: 'A1',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });
      await repository.criar({
        usuarioId: user.id,
        tipo: 'tipo-a',
        titulo: 'A2',
        mensagem: 'A2',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });
      await repository.criar({
        usuarioId: user.id,
        tipo: 'tipo-b',
        titulo: 'B1',
        mensagem: 'B1',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const result = await repository.listarPorUsuario({
        usuarioId: user.id,
        tipo: 'tipo-a',
        limit: 1,
        status: 'todas',
      });

      expect(result).toHaveLength(1);
      expect(result[0].tipo).toBe('tipo-a');
    });

    it('should return empty array when no notification matches', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const result = await repository.listarPorUsuario({
        usuarioId: user.id,
        tipo: 'inexistente',
        limit: 10,
        status: 'todas',
      });

      expect(result).toEqual([]);
    });
  });

  describe('marcarComoLida', () => {
    it('should mark notification as read and return true', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const result = await repository.marcarComoLida({
        notificacaoId: created.id,
        usuarioId: user.id,
      });

      expect(result).toBe(true);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.lidaEm).toBeInstanceOf(Date);
    });

    it('should return false when notification belongs to another user', async () => {
      const owner = await UsuarioBuilder.anUser().build();
      const other = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: owner.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const result = await repository.marcarComoLida({
        notificacaoId: created.id,
        usuarioId: other.id,
      });

      expect(result).toBe(false);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.lidaEm).toBeNull();
    });
  });

  describe('marcarTodasComoLidas', () => {
    it('should mark only unread notifications from the user as read', async () => {
      const user = await UsuarioBuilder.anUser().build();
      const other = await UsuarioBuilder.anUser().build();

      const first = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const second = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'B',
        mensagem: 'B',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const otherNotif = await repository.criar({
        usuarioId: other.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'C',
        mensagem: 'C',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      await repository.marcarComoLida({
        notificacaoId: second.id,
        usuarioId: user.id,
      });

      await repository.marcarTodasComoLidas(user.id);

      const [row1] = await db.select().from(notificacao).where(eq(notificacao.id, first.id));
      const [row2] = await db.select().from(notificacao).where(eq(notificacao.id, second.id));
      const [row3] = await db.select().from(notificacao).where(eq(notificacao.id, otherNotif.id));

      expect(row1.lidaEm).toBeInstanceOf(Date);
      expect(row2.lidaEm).toBeInstanceOf(Date);
      expect(row3.lidaEm).toBeNull();
    });
  });

  describe('marcarEnviadaEmTempoReal', () => {
    it('should set enviadaEmTempoRealEm', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      await repository.marcarEnviadaEmTempoReal(created.id);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.enviadaEmTempoRealEm).toBeInstanceOf(Date);
    });
  });

  describe('marcarEnviadaPorEmail', () => {
    it('should set enviadaPorEmailEm', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      await repository.marcarEnviadaPorEmail(created.id);

      const [row] = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(row.enviadaPorEmailEm).toBeInstanceOf(Date);
    });
  });

  describe('deletar', () => {
    it('should delete notification and return true', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const created = await repository.criar({
        usuarioId: user.id,
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'A',
        mensagem: 'A',
        chaveDedupe: `dedupe:${randomUUID()}`,
      });

      const result = await repository.deletar(created.id, user.id);

      expect(result).toBe(true);

      const rows = await db.select().from(notificacao).where(eq(notificacao.id, created.id));
      expect(rows).toHaveLength(0);
    });

    it('should return false when notification does not exist', async () => {
      const user = await UsuarioBuilder.anUser().build();

      const result = await repository.deletar(randomUUID(), user.id);

      expect(result).toBe(false);
    });
  });
});
