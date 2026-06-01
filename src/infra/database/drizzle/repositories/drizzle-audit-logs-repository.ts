import { desc, eq, gte, lte, and, count, type SQL } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { auditLog } from '@/infra/database/drizzle/schema';
import type { AuditLog, CreateAuditLogInput } from '@/modules/audit-log/audit-log';
import type {
  AuditLogsRepository,
  FindManyAuditLogsInput,
  FindManyAuditLogsResult,
} from '@/modules/audit-log/audit-log-repository';

type AuditLogRow = typeof auditLog.$inferSelect;

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.idLog,
    action: row.action,
    category: row.category,
    description: row.description,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId,
    targetDisplay: row.targetDisplay,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    requestId: row.requestId,
    changes: row.changes,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export class DrizzleAuditLogsRepository implements AuditLogsRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const [row] = await db
      .insert(auditLog)
      .values({
        action: input.action,
        category: input.category,
        description: input.description,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        actorEmail: input.actorEmail ?? null,
        targetEntityType: input.targetEntityType ?? null,
        targetEntityId: input.targetEntityId ?? null,
        targetDisplay: input.targetDisplay ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
        changes: input.changes ?? null,
        metadata: input.metadata ?? null,
      })
      .returning();

    return toAuditLog(row);
  }

  async findMany({
    filters,
    pagination,
  }: FindManyAuditLogsInput): Promise<FindManyAuditLogsResult> {
    const conditions: SQL[] = [];

    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }

    if (filters.actorUserId) {
      conditions.push(eq(auditLog.actorUserId, filters.actorUserId));
    }

    if (filters.startDate) {
      conditions.push(gte(auditLog.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(auditLog.createdAt, filters.endDate));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.pageSize;

    const rowsPromise = db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(pagination.pageSize)
      .offset(offset);

    const totalPromise = db.select({ value: count() }).from(auditLog).where(whereClause);

    const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);

    return {
      data: rows.map(toAuditLog),
      total: Number(totalRows[0]?.value ?? 0),
    };
  }
}
