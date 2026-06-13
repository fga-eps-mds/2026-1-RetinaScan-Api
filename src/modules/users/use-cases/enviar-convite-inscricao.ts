import { randomUUID } from 'node:crypto';
import { env } from '@/env';
import { notificationEmailTemplate } from '@/infra/mail/templates/notification-email-template';
import type { InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { EmailSender } from '@/modules/mail/domain/email-sender';
import { ConflictError } from '@/shared/errors/conflict-error';

export type EnviarConviteInscricaoUsecaseInput = {
  email: string;
  tipoPerfil?: 'MEDICO' | 'ESPECIALISTA';
  adminId?: string | null;
};

export class EnviarConviteInscricaoUsecase {
  constructor(
    private readonly inscricaoRepo: InscricaoMedicoRepository,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly emailProvider: EmailSender,
  ) {}

  async execute(input: EnviarConviteInscricaoUsecaseInput): Promise<void> {
    const existingUser = await this.usuariosRepo.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError('Já existe um usuário com este e-mail.');
    }

    const existingInvite = await this.inscricaoRepo.findByEmail(input.email);

    if (existingInvite && existingInvite.status !== 'REJEITADA' && existingInvite.tokenExpiresAt > new Date()) {
      throw new ConflictError('Já existe um convite pendente para este e-mail.');
    }

    const token = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.inscricaoRepo.criar({
      email: input.email,
      token,
      tokenExpiresAt,
      invitedBy: input.adminId ?? null,
      tipoPerfil: input.tipoPerfil ?? null,
    });

    const base = (env.ALLOWED_ORIGINS ?? '').split(',')[0] || '';
    const inviteUrl = `${base.replace(/\/$/, '')}/inscricao?token=${token}`;

    const template = notificationEmailTemplate({
      title: 'Convite para inscrição no RetinaScan',
      description: `Você recebeu um convite para completar seu cadastro no RetinaScan. Clique no botão abaixo para preencher o formulário de inscrição. Esse link expira em 7 dias.`,
      actionUrl: inviteUrl,
      actionLabel: 'Preencher inscrição',
      categoryLabel: 'Convite',
      timeLabel: new Date().toLocaleString('pt-BR'),
    });

    await this.emailProvider.send({
      to: input.email,
      subject: 'Convite para cadastro - RetinaScan',
      html: template.html,
      text: template.text,
    });
  }
}
