import FormData from 'form-data';
import axios from 'axios';

export interface PdfService {
  generateFromHtml(htmlString: string): Promise<Buffer>;
}

export class GotenbergPdfService implements PdfService {
  private readonly gotenbergUrl = process.env.GOTENBERG_URL ?? 'http://gotenberg:3000';

  async generateFromHtml(htmlString: string): Promise<Buffer> {
    const formData = new FormData();

    formData.append('files', Buffer.from(htmlString, 'utf-8'), {
      filename: 'index.html',
      contentType: 'text/html',
    });

    try {
      const response = await axios.post(
        `${this.gotenbergUrl}/forms/chromium/convert/html`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          responseType: 'arraybuffer',
          timeout: 10000,
        },
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('[GotenbergPdfService] Falha ao converter HTML para PDF:', error);
      throw new Error('Falha interna ao gerar o arquivo PDF do laudo.', { cause: error });
    }
  }
}
