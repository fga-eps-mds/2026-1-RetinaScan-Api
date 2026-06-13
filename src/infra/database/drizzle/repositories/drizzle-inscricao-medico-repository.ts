import { db } from '@/infra/database/drizzle/connection';
import { randomUUID } from 'node:crypto';
import { inscricaoMedico } from '@/infra/database/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { InscricaoMedico } from '@/modules/users/domain';
import type { CriarInscricaoInput, InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';

export class DrizzleInscricaoMedicoRepository implements InscricaoMedicoRepository {
  async criar(input: CriarInscricaoInput): Promise<InscricaoMedico> {
    const id = input.id ?? randomUUID();

    const result = await db
      .insert(inscricaoMedico)
      .values({
        id,
        email: input.email,
        token: input.token,
        tokenExpiresAt: input.tokenExpiresAt,
        status: 'CONVITE_ENVIADO',
        invitedBy: input.invitedBy ?? null,
      })
      .returning();

    return result[0] as InscricaoMedico;
  }

  async findByToken(token: string): Promise<InscricaoMedico | null> {
    const rows = await db.select().from(inscricaoMedico).where(eq(inscricaoMedico.token, token)).limit(1);
    return (rows[0] as InscricaoMedico | undefined) ?? null;
  }

  async findByEmail(email: string): Promise<InscricaoMedico | null> {
    const rows = await db.select().from(inscricaoMedico).where(eq(inscricaoMedico.email, email)).limit(1);
    return (rows[0] as InscricaoMedico | undefined) ?? null;
  }
}
