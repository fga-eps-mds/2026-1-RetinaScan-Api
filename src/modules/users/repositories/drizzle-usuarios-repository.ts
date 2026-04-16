import { db } from '@/infra/database/drizzle/connection';
import type { Usuario } from '../domain/usuario';
import type { UsuariosRepository } from './users-repository';
import { usuario } from '@/infra/database/drizzle/schema';
import { eq } from 'drizzle-orm';

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
}
