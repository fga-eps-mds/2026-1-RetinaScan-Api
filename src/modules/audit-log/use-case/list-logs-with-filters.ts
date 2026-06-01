import type {
  AuditLogsRepository,
  FindManyAuditLogsInput,
  FindManyAuditLogsResult,
} from '../audit-log-repository';

export class ListLogsWithFiltersUseCase {
  constructor(readonly auditLogsRepository: AuditLogsRepository) {}

  async execute(input: FindManyAuditLogsInput): Promise<FindManyAuditLogsResult> {
    return this.auditLogsRepository.findMany(input);
  }
}
