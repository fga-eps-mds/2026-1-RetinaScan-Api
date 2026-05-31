import type { EmailSender } from '@/modules/mail/domain/email-sender';
import { notificationEmailTemplate } from '@/infra/mail/templates/notification-email-template';

export interface IMessageService {
  sendPasswordResetLink(destination: string, link: string, userName?: string | null): Promise<void>;
}

export class AuthEmailMessageService implements IMessageService {
  constructor(private readonly emailProvider: EmailSender) {}

  async sendPasswordResetLink(destination: string, link: string, userName?: string | null): Promise<void> {
    const greeting = userName ? `Olá, ${userName}! ` : 'Olá! ';
    
    const template = notificationEmailTemplate({
      title: 'Recuperação de Senha',
      description: `${greeting}Você solicitou a recuperação da sua senha no RetinaScan. Clique no botão abaixo para criar uma nova senha. Caso você não tenha solicitado, pode ignorar este e-mail de forma segura.`,
      categoryLabel: 'Segurança da Conta',
      actionLabel: 'Redefinir Senha',
      actionUrl: link,
      timeLabel: new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    });

    await this.emailProvider.send({
      to: destination,
      subject: 'Recuperação de Senha - RetinaScan',
      html: template.html,
      text: template.text,
    });
  }
}
