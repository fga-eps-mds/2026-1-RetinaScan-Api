import { faker } from '@faker-js/faker';
import { cpf } from 'cpf-cnpj-validator';
import { db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema/user';
import { StatusUsuario, statusUsuario, TipoPerfil, tiposPerfil, type Usuario } from '@/modules/users/domain';

export class UsuarioBuilder {
  private readonly data: Usuario;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;
    this.data = {
      id: faker.string.uuid(),
      nomeCompleto: faker.person.fullName(),
      email: faker.internet.email(),
      cpf: cpf.generate(),
      crm: faker.string.numeric(6),
      dtNascimento: faker.date.past({ years: 30 }).toDateString(),
      tipoPerfil: tiposPerfil.ADMIN,
      status: statusUsuario.ATIVO,
    };
  }

  public withNomeCompleto(nomeCompleto: string): this {
    this.data.nomeCompleto = nomeCompleto;
    return this;
  }
  
  public withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  public withCpf(cpf: string): this {
    this.data.cpf = cpf;
    return this;
  }

  public withCrm(crm: string): this {
    this.data.crm = crm;
    return this;
  }

  public withDtNascimento(dtNascimento: string): this {
    this.data.dtNascimento = dtNascimento;
    return this;
  }

  public withTipoPerfil(tipoPerfil: TipoPerfil): this {
    this.data.tipoPerfil = tipoPerfil;
    return this;
  }

  public withStatus(status: StatusUsuario): this {
    this.data.status = status;
    return this;
  }

  public static anUser(): UsuarioBuilder {
    return new UsuarioBuilder();
  }

  public async build(): Promise<Usuario> {
    await this.database.insert(usuario).values({
      id: this.data.id,
      nomeCompleto: this.data.nomeCompleto,
      email: this.data.email,
      cpf: this.data.cpf,
      crm: this.data.crm ?? '',
      dtNascimento: this.data.dtNascimento
        ? new Date(this.data.dtNascimento).toISOString()
        : null,
      tipoPerfil: this.data.tipoPerfil,
      status: this.data.status,
    });

    return this.data;
}

  public getData() {
    return this.data;
  }
};
