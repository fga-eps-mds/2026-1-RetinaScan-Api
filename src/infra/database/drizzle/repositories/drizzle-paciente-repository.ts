import { db } from '@/infra/database/drizzle/connection';
import type { Paciente, Sexo } from '@/modules/patient/patient';
import { patient } from '@/infra/database/drizzle/schema';
import { eq, or, type SQL } from 'drizzle-orm';
import { PacientesRepository, PacienteFindByInput } from '@/modules/patient/patient-repository';

export class DrizzlePacientesRepository implements PacientesRepository {
  async findBy(params: PacienteFindByInput):Promise<Paciente | null> {
    const conds: SQL[] = [];
    if (params.id) conds.push(eq(patient.idPaciente, params.id));
    if (params.cpf) conds.push(eq(patient.cpf, params.cpf));
    
    if (!conds.length) return null;
    
    const result = await db
      .select()
      .from(patient)
      .where(or(...conds))
      .limit(1);

    if (!result.length) return null

    const row = result[0];
  
    return {
      id: row.idPaciente,
      nomeCompleto: row.nomeCompleto,
      cpf: row.cpf,
      dtNascimento: row.dtNascimento,
      sexo: row.sexo as Sexo,
      numProntuario: row.numProntuario,
    }
  }
}