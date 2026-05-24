type NotificationEmailTemplateInput = {
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
  categoryLabel?: string;
  timeLabel?: string;
};

export function notificationEmailTemplate(input: NotificationEmailTemplateInput) {
  const actionUrl = input.actionUrl ?? '#';
  const actionLabel = input.actionLabel ?? 'Abrir plataforma';
  const categoryLabel = input.categoryLabel ?? 'Notificação';
  const timeLabel = input.timeLabel ?? 'Agora';

  return {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f4f7f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f8;margin:0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;margin:0 auto;">
            <tr>
              <td style="padding:0 16px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                  <tr>
                    <td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#5b6670;padding:0 4px;">
                      RetinaScan
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #dbe5e7;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="padding:0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background:linear-gradient(135deg,#01696f 0%,#0f4c5c 100%);padding:24px 28px;">
                            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d7f0ef;margin-bottom:10px;">
                              ${categoryLabel}
                            </div>
                            <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:34px;font-weight:700;color:#ffffff;margin:0;">
                              ${input.title}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding:28px;">
                            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:28px;color:#24313a;margin:0 0 20px 0;">
                              ${input.description}
                            </div>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                              <tr>
                                <td style="background-color:#f6f9fa;border:1px solid #e3ebed;border-radius:12px;padding:16px 18px;">
                                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7780;margin-bottom:8px;">
                                    Resumo
                                  </div>
                                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#33424c;">
                                    Você recebeu uma atualização no sistema. Entre na plataforma para consultar os detalhes completos e tomar a ação necessária.
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                              <tr>
                                <td align="center" style="border-radius:12px;background-color:#01696f;">
                                  <a
                                    href="${actionUrl}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;"
                                  >
                                    ${actionLabel}
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6edef;padding-top:16px;">
                              <tr>
                                <td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7780;padding-top:16px;">
                                  Enviado por RetinaScan
                                </td>
                                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7780;padding-top:16px;">
                                  ${timeLabel}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                  <tr>
                    <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7b8790;padding:0 16px;">
                      Este é um email automático da plataforma RetinaScan. Caso não reconheça esta atividade, entre em contato com o suporte.
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `,
    text: [
      `RetinaScan`,
      ``,
      `${categoryLabel}`,
      `${input.title}`,
      ``,
      `${input.description}`,
      ``,
      `Você recebeu uma atualização no sistema. Entre na plataforma para consultar os detalhes completos e tomar a ação necessária.`,
      ``,
      `${actionLabel}: ${actionUrl}`,
      ``,
      `Enviado por RetinaScan • ${timeLabel}`,
    ].join('\n'),
  };
}
