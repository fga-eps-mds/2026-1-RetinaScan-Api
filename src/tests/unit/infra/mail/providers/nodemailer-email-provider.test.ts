import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { NodemailerEmailProvider } from '@/infra/mail/providers/nodemailer-email-provider';
import { mailer } from '@/infra/mail/mailer';

vi.mock('@/infra/mail/mailer', () => ({
  mailer: {
    sendMail: vi.fn(),
  },
}));

describe('NodemailerEmailProvider', () => {
  const provider = new NodemailerEmailProvider();
  const sendMailMock = vi.mocked(mailer.sendMail);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SMTP_FROM', 'sistema@example.com');
    vi.stubEnv('SMTP_REPLY_TO', 'suporte@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deve enviar email usando from e replyTo do input quando informados', async () => {
    sendMailMock.mockResolvedValueOnce({} as never);

    await provider.send({
      from: 'custom@example.com',
      replyTo: 'reply@example.com',
      to: 'destinatario@example.com',
      subject: 'Assunto teste',
      html: '<p>Olá</p>',
      text: 'Olá',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'custom@example.com',
      replyTo: 'reply@example.com',
      to: 'destinatario@example.com',
      subject: 'Assunto teste',
      html: '<p>Olá</p>',
      text: 'Olá',
    });
  });

  it('deve usar SMTP_FROM e SMTP_REPLY_TO do ambiente quando from e replyTo não forem informados', async () => {
    sendMailMock.mockResolvedValueOnce({} as never);

    await provider.send({
      to: 'destinatario@example.com',
      subject: 'Assunto teste',
      html: '<p>Olá</p>',
      text: 'Olá',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'sistema@example.com',
      replyTo: 'suporte@example.com',
      to: 'destinatario@example.com',
      subject: 'Assunto teste',
      html: '<p>Olá</p>',
      text: 'Olá',
    });
  });

  it('deve propagar erro do mailer.sendMail', async () => {
    const error = new Error('smtp down');
    sendMailMock.mockRejectedValueOnce(error);

    await expect(
      provider.send({
        to: 'destinatario@example.com',
        subject: 'Assunto teste',
        html: '<p>Olá</p>',
        text: 'Olá',
      }),
    ).rejects.toThrow('smtp down');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});
