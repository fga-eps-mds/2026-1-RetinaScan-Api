import { faker } from '@faker-js/faker';
import { db } from '@/infra/database/drizzle/connection';
import { solicitacaoCpfCrm, usuario } from '@/infra/database/drizzle/schema';
import {
  solicitacaoStatus,
  type SolicitacaoCpfCrm,
  type SolicitacaoStatus,
} from '@/modules/users/domain';
import { UsuarioBuilder } from './usuario-builder';
import { eq } from 'drizzle-orm';

export class SolicitacaoCpfCrmBuilder {
  private readonly data: SolicitacaoCpfCrm;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;
    this.data = {
      id: faker.string.uuid(),
      idUsuario: faker.string.uuid(),
      cpfNovo: null,
      crmNovo: null,
      status: solicitacaoStatus.PENDENTE,
      motivoRejeicao: null,
      analisadoPor: null,
      analisadoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  public withIdUsuario(idUsuario: string): this {
    this.data.idUsuario = idUsuario;
    return this;
  }

  public withCpfNovo(cpfNovo: string | null): this {
    this.data.cpfNovo = cpfNovo;
    return this;
  }

  public withCrmNovo(crmNovo: string | null): this {
    this.data.crmNovo = crmNovo;
    return this;
  }

  public withStatus(status: SolicitacaoStatus): this {
    this.data.status = status;
    return this;
  }

  public withAnalisadoPor(analisadoPor: string | null): this {
    this.data.analisadoPor = analisadoPor;
    return this;
  }

  public customData(data: Partial<SolicitacaoCpfCrm>): this {
    Object.assign(this.data, data);
    return this;
  }

  public static aSolicitacao(): SolicitacaoCpfCrmBuilder {
    return new SolicitacaoCpfCrmBuilder();
  }

  private async ensureUsuario(): Promise<void> {
    const existing = await this.database
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.id, this.data.idUsuario))
      .limit(1);

    if (existing.length) return;

    await UsuarioBuilder.anUser().customData({ id: this.data.idUsuario }).build();
  }

  public async build(): Promise<SolicitacaoCpfCrm> {
    await this.ensureUsuario();

    await this.database.insert(solicitacaoCpfCrm).values({
      id: this.data.id,
      idUsuario: this.data.idUsuario,
      cpfNovo: this.data.cpfNovo,
      crmNovo: this.data.crmNovo,
      status: this.data.status,
      motivoRejeicao: this.data.motivoRejeicao,
      analisadoPor: this.data.analisadoPor,
      analisadoEm: this.data.analisadoEm,
    });

    return this.data;
  }

  public getData(): SolicitacaoCpfCrm {
    return this.data;
  }
}
