import type { AuditLog, CreateAuditLogInput } from './audit-log';

export interface FindManyAuditLogsInput {
  filters: {
    action?: string;
    actorUserId?: string;
    startDate?: Date;
    endDate?: Date;
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

export interface FindManyAuditLogsResult {
  data: AuditLog[];
  total: number;
}

export interface AuditLogsRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  findMany(input: FindManyAuditLogsInput): Promise<FindManyAuditLogsResult>;
}
