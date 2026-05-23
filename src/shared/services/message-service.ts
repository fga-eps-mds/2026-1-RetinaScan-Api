import logger from '@/infra/logger';

export interface IMessageService {
  sendPasswordResetLink(destination: string, link: string): Promise<void>;
}

export class MockMessageService implements IMessageService {
  async sendPasswordResetLink(destination: string, link: string): Promise<void> {
    logger.info(`[MockMessageService] MOCK DE ENVIO DE MENSAGEM
    destino: ${destination}
    link: ${link}`);
  }
}
