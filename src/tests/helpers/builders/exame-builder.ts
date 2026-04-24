import { faker } from '@faker-js/faker';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';
import { eq } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';
import { exam, usuario } from '@/infra/database/drizzle/schema';
import { ExameStatus, Sexo, type Exame } from '@/modules/exam/exam';
import { UsuarioBuilder } from './usuario-builder';

export class ExameBuilder {
  private readonly data: Exame;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;
    this.data = {
      id: faker.string.uuid(),
      idUsuario: faker.string.uuid(),
      nomeCompleto: faker.person.fullName(),
      cpf: cpfUtil.generate(),
      sexo: Sexo.MASCULINO,
      dtNascimento: faker.date.past({ years: 30 }).toISOString().slice(0, 10),
      dtHora: faker.date.recent(),
      status: ExameStatus.CRIADO,
      comorbidades: null,
      descricao: null,
    };
  }

  public withIdUsuario(idUsuario: string): this {
    this.data.idUsuario = idUsuario;
    return this;
  }

  public withNomeCompleto(nomeCompleto: string): this {
    this.data.nomeCompleto = nomeCompleto;
    return this;
  }

  public withCpf(cpf: string): this {
    this.data.cpf = cpf;
    return this;
  }

  public withSexo(sexo: Sexo): this {
    this.data.sexo = sexo;
    return this;
  }

  public withDtNascimento(dtNascimento: string): this {
    this.data.dtNascimento = dtNascimento;
    return this;
  }

  public withDtHora(dtHora: Date): this {
    this.data.dtHora = dtHora;
    return this;
  }

  public withStatus(status: ExameStatus): this {
    this.data.status = status;
    return this;
  }

  public withComorbidades(comorbidades: string | null): this {
    this.data.comorbidades = comorbidades;
    return this;
  }

  public withDescricao(descricao: string | null): this {
    this.data.descricao = descricao;
    return this;
  }

  public static anExame(): ExameBuilder {
    return new ExameBuilder();
  }

  public async build(): Promise<Exame> {
    await this.ensureUsuario();

    await this.database.insert(exam).values({
      idExame: this.data.id,
      idUsuario: this.data.idUsuario,
      nomeCompleto: this.data.nomeCompleto,
      cpf: this.data.cpf,
      sexo: this.data.sexo,
      dtNascimento: this.data.dtNascimento,
      dtHora: this.data.dtHora,
      status: this.data.status,
      comorbidades: this.data.comorbidades ?? null,
      descricao: this.data.descricao ?? null,
    });

    return this.data;
  }

  private async ensureUsuario(): Promise<void> {
    const existing = await this.database
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.id, this.data.idUsuario))
      .limit(1);

    if (existing.length) return;

    const created = await UsuarioBuilder.anUser().build();
    this.data.idUsuario = created.id;
  }

  public getData() {
    return this.data;
  }
}
