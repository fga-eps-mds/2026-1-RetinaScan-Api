import type {
  AcquireReportEditingPresenceResult,
  ReportEditingPresence,
  ReportEditingPresenceService,
} from '@/shared/services/report-edit-lock-service';
import type Redis from 'ioredis';

/**
 * Aquisição atômica via Lua.
 *
 * KEYS[1] = chave do lock (exam key)
 * ARGV[1] = userId do solicitante
 * ARGV[2] = JSON da nova presença
 * ARGV[3] = ttlSeconds
 *
 * Retorno:
 *   [1, <presenceJSON>] → adquirido (estava livre ou já era deste userId+sessionId)
 *   [0, <presenceJSON>] → negado (pertence a outro userId)
 */
const ACQUIRE_SCRIPT = `
local existing = redis.call('GET', KEYS[1])

if existing == false then
  local ok = redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3], 'NX')
  if ok then
    return {1, ARGV[2]}
  end
  local current = redis.call('GET', KEYS[1])
  return {0, current or '{}'}
end

local data = cjson.decode(existing)

if data['userId'] ~= ARGV[1] then
  return {0, existing}
end

-- Mesmo usuário: renova (qualquer sessionId do mesmo user pode renovar)
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3], 'XX')
return {1, ARGV[2]}
`;

/**
 * Release atômico via Lua.
 * Só deleta se userId E sessionId baterem — impede que uma aba antiga
 * libere o lock de uma aba nova do mesmo usuário.
 *
 * KEYS[1] = chave do lock
 * ARGV[1] = userId
 * ARGV[2] = sessionId
 *
 * Retorno: 1 se deletou, 0 se não era o dono
 */
const RELEASE_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing == false then return 0 end

local data = cjson.decode(existing)

if data['userId'] ~= ARGV[1] then return 0 end
if data['sessionId'] ~= ARGV[2] then return 0 end

redis.call('DEL', KEYS[1])
return 1
`;

export class RedisReportEditingPresenceService implements ReportEditingPresenceService {
  constructor(private redis: Redis) {}

  private getKey(examId: string) {
    return `exam:${examId}:specialist-report:editing`;
  }

  private buildPresence(params: {
    examId: string;
    userId: string;
    nome: string;
    sessionId: string;
    ttlSeconds: number;
    startedAt?: string;
  }): ReportEditingPresence {
    const now = new Date();
    return {
      examId: params.examId,
      userId: params.userId,
      nome: params.nome,
      sessionId: params.sessionId,
      startedAt: params.startedAt ?? now.toISOString(),
      expiresAt: new Date(now.getTime() + params.ttlSeconds * 1000).toISOString(),
    };
  }

  async get(examId: string): Promise<ReportEditingPresence | null> {
    const value = await this.redis.get(this.getKey(examId));
    if (!value) return null;
    return JSON.parse(value) as ReportEditingPresence;
  }

  /**
   * Busca múltiplos locks em uma única roundtrip via MGET.
   */
  async getMany(examIds: string[]): Promise<(ReportEditingPresence | null)[]> {
    if (examIds.length === 0) return [];

    const keys = examIds.map((id) => this.getKey(id));
    const values = await this.redis.mget(...keys);

    return values.map((v) => (v ? (JSON.parse(v) as ReportEditingPresence) : null));
  }

  async acquire(params: {
    examId: string;
    userId: string;
    nome: string;
    sessionId: string;
    ttlSeconds: number;
  }): Promise<AcquireReportEditingPresenceResult> {
    const existing = await this.get(params.examId);

    const presence = this.buildPresence({
      ...params,
      startedAt: existing?.userId === params.userId ? existing.startedAt : undefined,
    });

    const result = (await this.redis.eval(
      ACQUIRE_SCRIPT,
      1,
      this.getKey(params.examId),
      params.userId,
      JSON.stringify(presence),
      String(params.ttlSeconds),
    )) as [number, string];

    const [acquired, presenceJson] = result;
    const currentPresence = JSON.parse(presenceJson) as ReportEditingPresence;

    return {
      acquired: acquired === 1,
      presence: currentPresence,
    };
  }

  async heartbeat(params: {
    examId: string;
    userId: string;
    sessionId: string;
    ttlSeconds: number;
  }): Promise<ReportEditingPresence | null> {
    const existing = await this.get(params.examId);
    if (!existing) return null;
    if (existing.userId !== params.userId) return null;

    const renewed: ReportEditingPresence = {
      ...existing,
      expiresAt: new Date(Date.now() + params.ttlSeconds * 1000).toISOString(),
    };

    const updated = await this.redis.set(
      this.getKey(params.examId),
      JSON.stringify(renewed),
      'EX',
      params.ttlSeconds,
      'XX',
    );

    if (!updated) return null;

    return renewed;
  }

  async release(params: { examId: string; userId: string; sessionId: string }): Promise<void> {
    await this.redis.eval(
      RELEASE_SCRIPT,
      1,
      this.getKey(params.examId),
      params.userId,
      params.sessionId,
    );
  }
}
