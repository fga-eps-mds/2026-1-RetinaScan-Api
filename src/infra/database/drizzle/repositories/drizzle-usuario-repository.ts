import { db } from '@/infra/database/drizzle/connection';
import type { Usuario } from '@/modules/users/domain';
import type {
  UsuarioFindByInput,
  UsuarioFindByOutput,
  UsuarioUpdateInput,
  UsuarioUpdateOutput,
  UsuariosRepository,
} from '@/modules/users/repositories';
import { usuario } from '@/infra/database/drizzle/schema';
import { eq, or, type SQL } from 'drizzle-orm';

export class DrizzleUsuariosRepository implements UsuariosRepository {
  async findByEmail(email: string): Promise<Usuario | null> {
    const result = await db.select().from(usuario).where(eq(usuario.email, email)).limit(1);

    return result[0] || null;
  }

  async findByCpf(cpf: string): Promise<Usuario | null> {
    const result = await db.select().from(usuario).where(eq(usuario.cpf, cpf)).limit(1);

    return result[0] || null;
  }

  async findByCrm(crm: string): Promise<Usuario | null> {
    const result = await db.select().from(usuario).where(eq(usuario.crm, crm)).limit(1);

    return result[0] || null;
  }

  async findBy(filters: UsuarioFindByInput): Promise<UsuarioFindByOutput> {
    const conds: SQL[] = [];

    if (filters.id) conds.push(eq(usuario.id, filters.id));
    if (filters.email) conds.push(eq(usuario.email, filters.email));
    if (filters.cpf) conds.push(eq(usuario.cpf, filters.cpf));
    if (filters.crm) conds.push(eq(usuario.crm, filters.crm));

    if (conds.length === 0) return null;

    const result = await db
      .select()
      .from(usuario)
      .where(or(...conds))
      .limit(1);

    return result[0] ?? null;
  }

  async update(id: string, params: UsuarioUpdateInput): Promise<UsuarioUpdateOutput> {
    const filteredParams = Object.fromEntries(
      Object.entries(params as Record<string, unknown>).filter(([, value]) => value !== undefined),
    ) as UsuarioUpdateInput;

    if (Object.keys(filteredParams).length === 0) {
      const currentUser = await this.findBy({ id });
      return currentUser;
    }

    const result = await db
      .update(usuario)
      .set(filteredParams)
      .where(eq(usuario.id, id))
      .returning();

    return result[0] ?? null;
  }

  async getAllUsers(): Promise<Usuario[]> {
    const result = await db.select().from(usuario).orderBy(usuario.createdAt);

    return result;
  }
}
