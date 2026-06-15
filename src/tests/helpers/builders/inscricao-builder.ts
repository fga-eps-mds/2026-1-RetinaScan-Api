import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import { db } from '@/infra/database/drizzle/connection';
import { inscricaoMedico } from '@/infra/database/drizzle/schema/user';
import type { InscricaoMedico, InscricaoStatus } from '@/modules/users/domain';
import { NodeCryptoCryptographyService } from '@/infra/shared/node-cryptography-service';

const cryptographyService = new NodeCryptoCryptographyService();

export class InscricaoBuilder {
  private data: {
    id: string;
    email: string;
    token: string;
    tokenExpiresAt: Date;
    status: InscricaoStatus;
    nomeCompleto: string | null;
    tipoPerfil: 'MEDICO' | 'ESPECIALISTA' | null;
    cpf: string | null;
    crm: string | null;
    dtNascimento: string | null;
    encryptedPassword: string | null;
    submittedAt: Date | null;
    motivoRejeicao: string | null;
    analisadoPor: string | null;
    analisadoEm: Date | null;
    invitedBy: string | null;
  };

  private constructor() {
    this.data = {
      id: randomUUID(),
      email: faker.internet.email(),
      token: 'mock-jwt-token',
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'CONVITE_ENVIADO',
      nomeCompleto: faker.person.fullName(),
      tipoPerfil: 'MEDICO',
      cpf: null,
      crm: null,
      dtNascimento: null,
      encryptedPassword: null,
      submittedAt: null,
      motivoRejeicao: null,
      analisadoPor: null,
      analisadoEm: null,
      invitedBy: null,
    };
  }

  public static aInscricao(): InscricaoBuilder {
    return new InscricaoBuilder();
  }

  public withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  public withToken(token: string): this {
    this.data.token = token;
    return this;
  }

  public withStatus(status: InscricaoStatus): this {
    this.data.status = status;
    return this;
  }

  public withExpiredToken(): this {
    this.data.tokenExpiresAt = new Date(Date.now() - 1000);
    return this;
  }

  public withFormData(): this {
    this.data.cpf = '12345678900';
    this.data.crm = '123456';
    this.data.dtNascimento = '1985-03-15';
    this.data.encryptedPassword = cryptographyService.encrypt({ text: 'Senha12345!' }).encryptedText;
    this.data.submittedAt = new Date();
    return this;
  }

  public async build(): Promise<InscricaoMedico> {
    await db.insert(inscricaoMedico).values({
      id: this.data.id,
      email: this.data.email,
      token: this.data.token,
      tokenExpiresAt: this.data.tokenExpiresAt,
      status: this.data.status,
      nomeCompleto: this.data.nomeCompleto,
      tipoPerfil: this.data.tipoPerfil,
      cpf: this.data.cpf,
      crm: this.data.crm,
      dtNascimento: this.data.dtNascimento,
      encryptedPassword: this.data.encryptedPassword,
      submittedAt: this.data.submittedAt,
      motivoRejeicao: this.data.motivoRejeicao,
      analisadoPor: this.data.analisadoPor,
      analisadoEm: this.data.analisadoEm,
      invitedBy: this.data.invitedBy,
    });

    return this.data as unknown as InscricaoMedico;
  }
}
