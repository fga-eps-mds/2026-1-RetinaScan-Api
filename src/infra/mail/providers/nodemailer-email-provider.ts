import type { EmailSender, SendEmailInput } from '@/modules/mail/domain/email-sender';
import { mailer } from '../mailer';

export class NodemailerEmailProvider implements EmailSender {
  async send(input: SendEmailInput): Promise<void> {
    await mailer.sendMail({
      from: input.from ?? process.env.SMTP_FROM!,
      replyTo: input.replyTo ?? process.env.SMTP_REPLY_TO,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
