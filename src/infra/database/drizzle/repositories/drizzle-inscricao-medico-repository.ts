import { db } from '@/infra/database/drizzle/connection';
import { randomUUID } from 'node:crypto';
import { inscricaoMedico } from '@/infra/database/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { InscricaoMedico } from '@/modules/users/domain';
import type {
  AvaliarInscricaoInput,
  CriarInscricaoInput,
  InscricaoMedicoRepository,
  ListarInscricoesInput,
  SubmeterInscricaoInput,
} from '@/modules/users/repositories/users-repository';

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
        nomeCompleto: input.nomeCompleto ?? null,
        tipoPerfil: input.tipoPerfil ?? null,
      })
      .returning();

    return result[0] as InscricaoMedico;
  }

  async findByToken(token: string): Promise<InscricaoMedico | null> {
    const rows = await db
      .select()
      .from(inscricaoMedico)
      .where(eq(inscricaoMedico.token, token))
      .limit(1);
    return (rows[0] as InscricaoMedico | undefined) ?? null;
  }

  async findByEmail(email: string): Promise<InscricaoMedico | null> {
    const rows = await db
      .select()
      .from(inscricaoMedico)
      .where(eq(inscricaoMedico.email, email))
      .limit(1);
    return (rows[0] as InscricaoMedico | undefined) ?? null;
  }

  async findById(id: string): Promise<InscricaoMedico | null> {
    const rows = await db.select().from(inscricaoMedico).where(eq(inscricaoMedico.id, id)).limit(1);
    return (rows[0] as InscricaoMedico | undefined) ?? null;
  }

  async submeter(input: SubmeterInscricaoInput): Promise<InscricaoMedico> {
    const result = await db
      .update(inscricaoMedico)
      .set({
        nomeCompleto: input.nomeCompleto,
        cpf: input.cpf,
        crm: input.crm,
        dtNascimento: input.dtNascimento,
        encryptedPassword: input.encryptedPassword,
        submittedAt: input.submittedAt,
        status: 'PENDENTE',
      })
      .where(eq(inscricaoMedico.id, input.id))
      .returning();
    return result[0] as InscricaoMedico;
  }

  async avaliar(input: AvaliarInscricaoInput): Promise<InscricaoMedico> {
    const result = await db
      .update(inscricaoMedico)
      .set({
        status: input.decisao,
        analisadoPor: input.analisadoPor,
        analisadoEm: input.analisadoEm,
        motivoRejeicao: input.motivoRejeicao ?? null,
      })
      .where(eq(inscricaoMedico.id, input.id))
      .returning();
    return result[0] as InscricaoMedico;
  }

  async listar(input?: ListarInscricoesInput): Promise<InscricaoMedico[]> {
    if (input?.status) {
      const rows = await db
        .select()
        .from(inscricaoMedico)
        .where(eq(inscricaoMedico.status, input.status));
      return rows as InscricaoMedico[];
    }
    return (await db.select().from(inscricaoMedico)) as InscricaoMedico[];
  }
}
