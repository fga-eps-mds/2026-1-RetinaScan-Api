import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { auth } from '@/lib/auth';
import { DrizzleAuditLogsRepository } from '@/infra/database/drizzle/repositories/drizzle-audit-logs-repository';
import { AuditLogService } from '@/modules/audit-log/services/audit-log-service';

export const auditHooks = fp((app: FastifyInstance) => {
  app.addHook('preSerialization', async (request, _reply, payload) => {
    const audit = request.routeOptions.config.audit;

    if (!audit?.enabled) {
      return payload;
    }

    request.auditReplyPayload = payload;
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    const audit = request.routeOptions.config.audit;

    if (!audit?.enabled) return;

    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      const payload = request.auditReplyPayload;
      const target = audit.getTarget?.(request, payload) ?? {};
      const changes = audit.getChanges?.(request, payload) ?? null;
      const metadata = audit.getMetadata?.(request, payload) ?? null;

      const description =
        audit.getDescription?.(request, payload) ?? `${request.method} ${request.url}`;

      const repository = new DrizzleAuditLogsRepository();
      const auditLogService = new AuditLogService(repository);

      await auditLogService.register({
        action: audit.action,
        category: audit.category,
        description,
        actorName: session?.user.name ?? request.user?.nomeCompleto ?? null,
        actorUserId: session?.user.id ?? request.user?.id ?? null,
        actorEmail: session?.user.email ?? request.user?.email ?? null,
        targetEntityType: target.targetEntityType ?? null,
        targetEntityId: target.targetEntityId ?? null,
        targetDisplay: target.targetDisplay ?? null,
        ipAddress: session?.session.ipAddress ?? request.ip,
        userAgent: session?.session.userAgent ?? request.headers['user-agent'] ?? null,
        requestId: request.id,
        changes,
        metadata: {
          ...(metadata ?? {}),
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: reply.elapsedTime,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'failed to persist audit log');
    }
  });
});
