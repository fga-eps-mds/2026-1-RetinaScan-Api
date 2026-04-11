import logger from "@/infra/logger";
import { buildApp } from "@/api";
import { env } from "@/env";
import { connectDatabase } from "@/infra/database/drizzle/connection";
import { UsersRepository } from "./modules/users/repositories/user/users-repository";
import { ensureAdminUserExists } from "./modules/users/use-cases/ensure-admin-exists";

export async function server(): Promise<void> {
  logger.info("Setting up server");

  await connectDatabase();
  const app = await buildApp();

  logger.info("Executando seed do admin");
  await ensureAdminUserExists();
  logger.info("Seed do admin concluído");

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  logger.info("🍺 Server is already up");
}

server().catch((error) => logger.error("Error starting server", error));
