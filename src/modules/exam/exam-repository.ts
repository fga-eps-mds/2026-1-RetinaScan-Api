import type { Exame } from './exam';

export interface ExamesRepository {
  create(input: Exame): Promise<Exame>;
}
