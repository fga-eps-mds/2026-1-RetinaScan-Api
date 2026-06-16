import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnviarConvitesEmLoteUsecase } from '@/modules/users/use-cases/enviar-convites-em-lote-usecase';

describe('EnviarConvitesEmLoteUsecase', () => {
  let inscricaoRepo: any;
  let usuariosRepo: any;
  let inviteTokenService: any;
  let messageBroker: any;
  let usecase: EnviarConvitesEmLoteUsecase;

  beforeEach(() => {
    vi.clearAllMocks();

    inscricaoRepo = {
      criar: vi.fn().mockResolvedValue({ id: 'inscricao-id' }),
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    usuariosRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    inviteTokenService = {
      sign: vi.fn().mockResolvedValue('mock.jwt.token'),
    };

    messageBroker = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    usecase = new EnviarConvitesEmLoteUsecase(
      inscricaoRepo,
      usuariosRepo,
      inviteTokenService,
      messageBroker,
    );
  });

  it('should create inscricao and enqueue job for valid email', async () => {
    const result = await usecase.execute({
      convites: [{ email: 'doc@test.com', nome: 'Dr. João', tipoPerfil: 'MEDICO' }],
      adminId: 'admin-id',
    });

    expect(inscricaoRepo.criar).toHaveBeenCalledTimes(1);
    const criarArg = inscricaoRepo.criar.mock.calls[0][0];
    expect(criarArg.email).toBe('doc@test.com');
    expect(criarArg.nomeCompleto).toBe('Dr. João');
    expect(criarArg.tipoPerfil).toBe('MEDICO');
    expect(criarArg.token).toBe('mock.jwt.token');

    expect(messageBroker.publish).toHaveBeenCalledTimes(1);
    const publishArg = messageBroker.publish.mock.calls[0][0];
    expect(publishArg.queueName).toBe('send-invite-email');
    expect(publishArg.payload.to).toBe('doc@test.com');

    expect(result.enviados).toBe(1);
    expect(result.ignorados).toBe(0);
    expect(result.detalhes[0].status).toBe('enviado');
  });

  it('should ignore email when user already exists', async () => {
    usuariosRepo.findByEmail.mockResolvedValue({ id: 'u1' });

    const result = await usecase.execute({
      convites: [{ email: 'existing@test.com', nome: 'Já Existe' }],
      adminId: 'admin-id',
    });

    expect(inscricaoRepo.criar).not.toHaveBeenCalled();
    expect(messageBroker.publish).not.toHaveBeenCalled();
    expect(result.ignorados).toBe(1);
    expect(result.detalhes[0].status).toBe('ignorado');
  });

  it('should ignore email when active invite already exists', async () => {
    inscricaoRepo.findByEmail.mockResolvedValue({
      status: 'CONVITE_ENVIADO',
      tokenExpiresAt: new Date(Date.now() + 10_000),
    });

    const result = await usecase.execute({
      convites: [{ email: 'invite@test.com', nome: 'Já Convidado' }],
      adminId: 'admin-id',
    });

    expect(inscricaoRepo.criar).not.toHaveBeenCalled();
    expect(result.ignorados).toBe(1);
  });

  it('should process valid and ignore invalid in same batch', async () => {
    usuariosRepo.findByEmail
      .mockResolvedValueOnce({ id: 'u1' })
      .mockResolvedValueOnce(null);

    const result = await usecase.execute({
      convites: [
        { email: 'existing@test.com', nome: 'Já Existe' },
        { email: 'new@test.com', nome: 'Novo Médico' },
      ],
      adminId: 'admin-id',
    });

    expect(result.enviados).toBe(1);
    expect(result.ignorados).toBe(1);
    expect(inscricaoRepo.criar).toHaveBeenCalledTimes(1);
    expect(messageBroker.publish).toHaveBeenCalledTimes(1);
  });

  it('should default tipoPerfil to MEDICO when not provided', async () => {
    await usecase.execute({
      convites: [{ email: 'doc@test.com', nome: 'Dr. João' }],
      adminId: 'admin-id',
    });

    expect(inscricaoRepo.criar.mock.calls[0][0].tipoPerfil).toBe('MEDICO');
  });
});
