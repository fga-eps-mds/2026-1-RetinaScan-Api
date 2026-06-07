export type ReportEditingPresence = {
  examId: string;
  userId: string;
  nome: string;
  /** Identifica a aba/sessão do browser. Gerado no front com crypto.randomUUID(). */
  sessionId: string;
  startedAt: string;
  expiresAt: string;
};

export type AcquireReportEditingPresenceResult =
  | { acquired: true; presence: ReportEditingPresence }
  | { acquired: false; presence: ReportEditingPresence };

export interface ReportEditingPresenceService {
  /** Tenta adquirir o lock de edição para um exame. */
  acquire(params: {
    examId: string;
    userId: string;
    nome: string;
    sessionId: string;
    ttlSeconds: number;
  }): Promise<AcquireReportEditingPresenceResult>;

  /**
   * Renova o TTL do lock. Só renova se o userId e sessionId baterem.
   * Retorna null se o lock não existe ou não pertence ao solicitante.
   */
  heartbeat(params: {
    examId: string;
    userId: string;
    sessionId: string;
    ttlSeconds: number;
  }): Promise<ReportEditingPresence | null>;

  /**
   * Libera o lock. Só libera se userId e sessionId baterem —
   * evita que uma aba antiga libere o lock de uma aba nova do mesmo usuário.
   */
  release(params: { examId: string; userId: string; sessionId: string }): Promise<void>;

  /** Retorna o lock atual de um exame, ou null se livre. */
  get(examId: string): Promise<ReportEditingPresence | null>;

  /**
   * Retorna os locks ativos para uma lista de examIds em uma única roundtrip.
   * Exams sem lock retornam null na posição correspondente.
   */
  getMany(examIds: string[]): Promise<(ReportEditingPresence | null)[]>;
}
