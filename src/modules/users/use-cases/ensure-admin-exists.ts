import { eq } from "drizzle-orm";
import logger from "@/infra/logger";
import { db } from "@/infra/database/drizzle/connection";
import { user } from "@/infra/database/drizzle/schema";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function ensureAdminUserExists(): Promise<void> {
  try {
    if (
      !env.ADMIN_EMAIL ||
      !env.ADMIN_PASSWORD ||
      !env.ADMIN_NAME ||
      !env.ADMIN_BIRTH_DATE ||
      !env.ADMIN_CRM ||
      !env.ADMIN_CPF ||
      !env.ADMIN_IDENTITY_NUMBER
    ) {
      logger.warn("Seed do admin ignorado: variáveis ADMIN_* ausentes");
      return;
    }

    logger.info("Verificando se o usuário admin já existe", {
      email: env.ADMIN_EMAIL,
    });

    const existingAdmin = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.email, env.ADMIN_EMAIL))
      .limit(1);

    if (!existingAdmin[0]) {
      logger.info("Usuário admin não encontrado, criando conta", {
        email: env.ADMIN_EMAIL,
      });

      await auth.api.signUpEmail({
        body: {
          name: env.ADMIN_NAME,
          email: env.ADMIN_EMAIL,
          password: env.ADMIN_PASSWORD,
          birthDate: new Date(env.ADMIN_BIRTH_DATE),
          crm: env.ADMIN_CRM,
          cpf: env.ADMIN_CPF,
          identityNumber: env.ADMIN_IDENTITY_NUMBER,
        },
      });

      logger.info("Conta de admin criada com sucesso", {
        email: env.ADMIN_EMAIL,
      });
    } else {
      logger.info("Usuário admin já existia", {
        email: env.ADMIN_EMAIL,
        role: existingAdmin[0].role,
      });
    }

    await db
      .update(user)
      .set({ role: "ADMIN" })
      .where(eq(user.email, env.ADMIN_EMAIL));

    logger.info("Role de admin garantida com sucesso", {
      email: env.ADMIN_EMAIL,
      role: "admin",
    });
  } catch (error) {
    logger.error("Falha ao executar seed do admin", { error });
    throw error;
  }
}
