import logger from "@/infra/logger";
import { buildApp } from "@/api";
import { env } from "@/env";
import { connectDatabase } from "@/infra/database/drizzle/connection";

export async function server(): Promise<void> {
  logger.info("Setting up server");

  await connectDatabase();
  const app = await buildApp();

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  logger.info("🍺 Server is already up");
}

server().catch((error) => logger.error("Error starting server", error));
