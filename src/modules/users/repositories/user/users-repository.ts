import { db } from "@/infra/database/drizzle/connection";
import { user } from "@/infra/database/drizzle/schema";
import { eq } from "drizzle-orm";

export type UserRole = "ADMIN" | "MEDICO";

export class UsersRepository {
  async findByEmail(email: string) {
    const result = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return result[0] ?? null;
  }

  async updateRoleByEmail(email: string, role: UserRole): Promise<void> {
    await db.update(user).set({ role }).where(eq(user.email, email));
  }
}
