import { randomUUID } from 'node:crypto';
import { env } from '@/env';
import { notificationEmailTemplate } from '@/infra/mail/templates/notification-email-template';
import type { InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { InviteTokenService } from '@/shared/services/invite-token-service';
import type { MessageBroker } from '@/shared/services/message-broker';
import { QueueNames } from '@/infra/queue/types';

export type ConviteInput = {
  email: string;
  nome: string;
  tipoPerfil?: 'MEDICO' | 'ESPECIALISTA';
};

export type ConviteDetalhe = {
  email: string;
  status: 'enviado' | 'ignorado';
  motivo?: string;
};

export type EnviarConvitesEmLoteInput = {
  convites: ConviteInput[];
  adminId: string;
};

export type EnviarConvitesEmLoteOutput = {
  enviados: number;
  ignorados: number;
  detalhes: ConviteDetalhe[];
};

export class EnviarConvitesEmLoteUsecase {
  constructor(
    private readonly inscricaoRepo: InscricaoMedicoRepository,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly inviteTokenService: InviteTokenService,
    private readonly messageBroker: MessageBroker,
  ) {}

  async execute(input: EnviarConvitesEmLoteInput): Promise<EnviarConvitesEmLoteOutput> {
    const detalhes: ConviteDetalhe[] = [];

    for (const convite of input.convites) {
      const motivo = await this.getMotivoDeIgnorar(convite.email);
      if (motivo) {
        detalhes.push({ email: convite.email, status: 'ignorado', motivo });
        continue;
      }
      await this.criarEEnfileirar(convite, input.adminId);
      detalhes.push({ email: convite.email, status: 'enviado' });
    }

    return {
      enviados: detalhes.filter((d) => d.status === 'enviado').length,
      ignorados: detalhes.filter((d) => d.status === 'ignorado').length,
      detalhes,
    };
  }

  private async getMotivoDeIgnorar(email: string): Promise<string | null> {
    if (await this.usuariosRepo.findByEmail(email)) {
      return 'Já existe um usuário com este e-mail';
    }
    const existing = await this.inscricaoRepo.findByEmail(email);
    if (existing && existing.status !== 'REJEITADA' && existing.tokenExpiresAt > new Date()) {
      return 'Já existe um convite ativo para este e-mail';
    }
    return null;
  }

  private async criarEEnfileirar(convite: ConviteInput, adminId: string): Promise<void> {
    const id = randomUUID();
    const tipoPerfil = convite.tipoPerfil ?? 'MEDICO';
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = await this.inviteTokenService.sign({
      sub: id,
      email: convite.email,
      nomeCompleto: convite.nome,
      tipoPerfil,
    });

    await this.inscricaoRepo.criar({
      id,
      email: convite.email,
      token,
      tokenExpiresAt,
      nomeCompleto: convite.nome,
      tipoPerfil,
      invitedBy: adminId,
    });

    const inviteUrl = `${env.FRONTEND_URL}/inscricao?token=${token}`;
    const template = notificationEmailTemplate({
      title: 'Convite para inscrição no RetinaScan',
      description:
        'Você recebeu um convite para completar seu cadastro no RetinaScan. Clique no botão abaixo para preencher o formulário de inscrição. Esse link expira em 7 dias.',
      actionUrl: inviteUrl,
      actionLabel: 'Preencher inscrição',
      categoryLabel: 'Convite',
      timeLabel: new Date().toLocaleString('pt-BR'),
    });

    await this.messageBroker.publish({
      queueName: QueueNames.sendInviteEmail,
      payload: {
        to: convite.email,
        subject: 'Convite para cadastro - RetinaScan',
        html: template.html,
        text: template.text,
      },
    });
  }
}
