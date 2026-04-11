import type { FastifyPluginAsync } from "fastify";
import healthHandler from "./health";
import { authRoutes } from "./auth";

const registerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", healthHandler);

  await app.register(authRoutes);
};

export default registerRoutes;
