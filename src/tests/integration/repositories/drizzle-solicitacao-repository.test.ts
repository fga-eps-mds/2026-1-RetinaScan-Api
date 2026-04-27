import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { connectDatabase, db } from '@/infra/database/drizzle/connection';
import { solicitacaoCpfCrm, usuario } from '@/infra/database/drizzle/schema';
import { DrizzleSolicitacaoCpfCrmRepository } from '@/infra/database/drizzle/repositories/drizzle-solicitacao-repository';
import { solicitacaoStatus } from '@/modules/users/domain';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { SolicitacaoCpfCrmBuilder } from '@/tests/helpers/builders/solicitacao-cpf-crm-builder';

describe('DrizzleSolicitacaoCpfCrmRepository.listar (integration)', () => {
  const repository = new DrizzleSolicitacaoCpfCrmRepository();

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ${solicitacaoCpfCrm} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${usuario} RESTART IDENTITY CASCADE`);
  });

  it('should return the request without user data when relations is not specified', async () => {
    const usuarioCriado = await UsuarioBuilder.anUser().build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao()
      .withIdUsuario(usuarioCriado.id)
      .withCpfNovo('52998224725')
      .build();

    const result = await repository.listar();

    expect(result).toHaveLength(1);
    expect(result[0].idUsuario).toBe(usuarioCriado.id);
    expect(result[0].usuario).toBeUndefined();
  });

  it('should load the user data when relations is true', async () => {
    const usuarioCriado = await UsuarioBuilder.anUser()
      .withNomeCompleto('Medico Teste')
      .withEmail('medico@test.com')
      .build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao()
      .withIdUsuario(usuarioCriado.id)
      .withStatus(solicitacaoStatus.PENDENTE)
      .build();

    const result = await repository.listar({ relations: true });

    expect(result).toHaveLength(1);
    expect(result[0].usuario).toMatchObject({
      id: usuarioCriado.id,
      nomeCompleto: 'Medico Teste',
      email: 'medico@test.com',
    });
  });

  it('should apply the status filter with relations', async () => {
    const medico = await UsuarioBuilder.anUser().build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao()
      .withIdUsuario(medico.id)
      .withStatus(solicitacaoStatus.PENDENTE)
      .build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao()
      .withIdUsuario(medico.id)
      .withStatus(solicitacaoStatus.APROVADA)
      .build();

    const result = await repository.listar({
      status: solicitacaoStatus.PENDENTE,
      relations: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(solicitacaoStatus.PENDENTE);
    expect(result[0].usuario?.id).toBe(medico.id);
  });

  it('should apply the idUsuario filter with relations', async () => {
    const medicoA = await UsuarioBuilder.anUser().build();
    const medicoB = await UsuarioBuilder.anUser().build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao().withIdUsuario(medicoA.id).build();
    await SolicitacaoCpfCrmBuilder.aSolicitacao().withIdUsuario(medicoB.id).build();

    const result = await repository.listar({
      idUsuario: medicoA.id,
      relations: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].idUsuario).toBe(medicoA.id);
    expect(result[0].usuario?.id).toBe(medicoA.id);
  });

  it('should return an empty list when there are no requests', async () => {
    const result = await repository.listar({ relations: true });

    expect(result).toHaveLength(0);
  });
});
