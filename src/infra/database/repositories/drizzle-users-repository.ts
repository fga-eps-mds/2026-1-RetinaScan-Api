import { eq } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';
import { user } from '@/infra/database/drizzle/schema';
import type { User, UserRole } from '@/domain/user';
import type { IUsersRepository } from '@/application/ports/repositories/users-repository';

export class DrizzleUsersRepository implements IUsersRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(user).where(eq(user.email, email)).limit(1);

    return result[0] ?? null;
  }

  async updateRoleByEmail(email: string, role: UserRole): Promise<void> {
    await db.update(user).set({ role }).where(eq(user.email, email));
  }
}
