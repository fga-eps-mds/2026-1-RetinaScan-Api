import { env } from '@/env';
import pino, { type Logger as PinoLogger } from 'pino';

export type CategoryLogger = 'HTTP' | 'DB' | 'SYS' | 'CRIT';

type CategoryLoggers = Record<CategoryLogger, PinoLogger>;

export class Logger {
  private readonly root: PinoLogger;
  private readonly child: CategoryLoggers;

  /** Instância Pino subjacente (ex.: opção `logger` do Fastify). */
  get pino(): PinoLogger {
    return this.root;
  }

  constructor() {
    const isDev = env.NODE_ENV !== 'production';
    this.root = pino({
      name: 'retina-scan-api',
      level: isDev ? 'debug' : 'info',
      ...(isDev && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        },
      }),
    });

    this.child = this.createChildren();
  }

  public info(message: string, payload?: object): void {
    if (payload) {
      this.root.info(payload, message);
      return;
    }

    this.root.info(message);
  }

  public debug(message: string, payload?: object): void {
    if (payload) {
      this.root.debug(payload, message);
      return;
    }

    this.root.debug(message);
  }

  public warn(message: string, payload?: object): void {
    if (payload) {
      this.root.warn(payload, message);
      return;
    }

    this.root.warn(message);
  }

  public error(message: string, payload?: object): void {
    if (payload) {
      this.root.error(payload, message);
      return;
    }

    this.root.error(message);
  }

  public fatal(message: string, payload?: object): void {
    if (payload) {
      this.root.fatal(payload, message);
      return;
    }

    this.root.fatal(message);
  }

  private createChildren(): CategoryLoggers {
    return {
      HTTP: this.root.child({ category: 'HTTP' }),
      DB: this.root.child({ category: 'DB' }),
      SYS: this.root.child({ category: 'SYS' }),
      CRIT: this.root.child({ category: 'CRIT' }),
    };
  }
}

const logger = new Logger();
export default logger;
