import { Paciente } from './patient'

export type PacienteFindByInput = Partial<{
  id: string
  cpf: string
}>

export interface PacientesRepository {
  findBy(params: PacienteFindByInput): Promise<Paciente | null>
}