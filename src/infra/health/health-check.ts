export type HealthCheckResult = {
  ok: boolean;
  ms: number;
};

export interface HealthChecker {
  check(): Promise<HealthCheckResult>;
}
