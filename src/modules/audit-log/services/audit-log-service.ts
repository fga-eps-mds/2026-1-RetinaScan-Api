import type { CreateAuditLogInput, AuditLog } from '../audit-log';
import type { AuditLogsRepository } from '../audit-log-repository';

export class AuditLogService {
  constructor(readonly auditLogsRepository: AuditLogsRepository) {}

  async register(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.auditLogsRepository.create(input);
  }
}
