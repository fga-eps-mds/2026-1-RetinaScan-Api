import { describe, it, expect, vi } from 'vitest';
import { AuthEmailMessageService } from '@/shared/services/message-service';
import type { EmailSender } from '@/modules/mail/domain/email-sender';
import * as templateModule from '@/infra/mail/templates/notification-email-template';

describe('AuthEmailMessageService', () => {
  it('should format the template and call emailProvider.send with the correct parameters', async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockEmailSender: EmailSender = {
      send: mockSend,
    };

    const service = new AuthEmailMessageService(mockEmailSender);

    const templateSpy = vi.spyOn(templateModule, 'notificationEmailTemplate').mockReturnValue({
      html: '<html>test html</html>',
      text: 'test text',
    });

    const destination = 'test@example.com';
    const link = 'http://localhost/reset?token=123';
    const userName = 'João';

    await service.sendPasswordResetLink(destination, link, userName);

    expect(templateSpy).toHaveBeenCalledTimes(1);
    expect(templateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Recuperação de Senha',
        actionUrl: link,
        categoryLabel: 'Segurança da Conta',
        actionLabel: 'Redefinir Senha',
      })
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      to: destination,
      subject: 'Recuperação de Senha - RetinaScan',
      html: '<html>test html</html>',
      text: 'test text',
    });

    templateSpy.mockRestore();
  });
});
