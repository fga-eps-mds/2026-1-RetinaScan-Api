import { db } from '@/infra/database/drizzle/connection';
import { examComorbidity } from '@/infra/database/drizzle/schema';
import type { Comorbidade } from '@/modules/exam/exam';
import { NodeCryptoCryptographyService } from '@/infra/shared/node-cryptography-service';

type ComorbidadeData = Comorbidade;

const cryptographyService = new NodeCryptoCryptographyService();

function encrypt(text: string): string {
  return cryptographyService.encrypt({ text }).encryptedText;
}

export class ComorbidadeBuilder {
  private readonly data: ComorbidadeData;
  private readonly database: typeof db;

  private constructor(idExame: string) {
    this.database = db;
    this.data = {
      idExame,
      diabetes: false,
      diabetesAnos: null,
      diabetesUsoInsulina: false,
      diabetesControlado: false,
      hipertensao: false,
      hipertensaoControlada: false,
      altaMiopia: false,
      glaucoma: false,
      usoHidroxicloroquina: false,
      uveite: false,
      catarata: false,
      outrasComorbidades: false,
      outrasComorbidadesDescricao: null,
      qualidadeTecnicaDificuldade: false,
    };
  }

  public static aComorbidade(idExame: string): ComorbidadeBuilder {
    return new ComorbidadeBuilder(idExame);
  }

  public with(overrides: Partial<ComorbidadeData>): this {
    Object.assign(this.data, overrides);
    return this;
  }

  public async build(): Promise<Comorbidade> {
    await this.database.insert(examComorbidity).values({
      idExame: this.data.idExame,
      diabetes: this.data.diabetes,
      diabetesAnos: this.data.diabetesAnos ?? null,
      diabetesUsoInsulina: this.data.diabetesUsoInsulina,
      diabetesControlado: this.data.diabetesControlado,
      hipertensao: this.data.hipertensao,
      hipertensaoControlada: this.data.hipertensaoControlada,
      altaMiopia: this.data.altaMiopia,
      glaucoma: this.data.glaucoma,
      usoHidroxicloroquina: this.data.usoHidroxicloroquina,
      uveite: this.data.uveite,
      catarata: this.data.catarata,
      outrasComorbidades: this.data.outrasComorbidades,
      outrasComorbidadesDescricao: this.data.outrasComorbidadesDescricao
        ? encrypt(this.data.outrasComorbidadesDescricao)
        : null,
      qualidadeTecnicaDificuldade: this.data.qualidadeTecnicaDificuldade,
    });
    return this.data;
  }
}
