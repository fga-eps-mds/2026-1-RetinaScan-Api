import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';

export async function createRouteTestApp(routes: FastifyPluginAsync): Promise<FastifyInstance> {
  const app = Fastify();

  app.setValidatorCompiler(() => (data) => ({ value: data }));
  app.setSerializerCompiler(() => (data) => JSON.stringify(data));

  await app.register(routes);
  await app.ready();

  return app;
}
