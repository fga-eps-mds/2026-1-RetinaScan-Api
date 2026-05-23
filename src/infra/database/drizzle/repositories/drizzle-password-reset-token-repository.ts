import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '@/infra/database/drizzle/connection';
import { passwordResetToken } from '@/infra/database/drizzle/schema/user';
import type {
  PasswordResetToken,
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from '@/modules/users/repositories/password-reset-token-repository';

export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  async criar(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const id = crypto.randomUUID();

    const [token] = await db
      .insert(passwordResetToken)
      .values({
        id,
        idUsuario: input.idUsuario,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      })
      .returning();

    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const [token] = await db
      .select()
      .from(passwordResetToken)
      .where(eq(passwordResetToken.tokenHash, tokenHash))
      .limit(1);

    return token || null;
  }

  async markAsUsed(id: string): Promise<void> {
    await db
      .update(passwordResetToken)
      .set({
        usedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(passwordResetToken.id, id));
  }

  async invalidateAllFromUser(idUsuario: string): Promise<void> {
    await db
      .update(passwordResetToken)
      .set({
        usedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetToken.idUsuario, idUsuario),
          isNull(passwordResetToken.usedAt)
        )
      );
  }
}
