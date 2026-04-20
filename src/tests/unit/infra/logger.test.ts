import { beforeEach, describe, expect, it, vi } from 'vitest';

const pinoInstanceMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
};

type PinoMockWithSerializers = ReturnType<typeof vi.fn> & {
  stdSerializers: {
    err: string;
  };
};

const pinoMock = vi.fn(() => pinoInstanceMock) as PinoMockWithSerializers;

pinoMock.stdSerializers = {
  err: 'serializer',
};

vi.mock('pino', () => ({
  default: pinoMock,
}));

vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create pino instance with correct config', async () => {
    const mod = await import('../../../infra/logger/index.js');

    // limpa a instância criada no import:
    pinoMock.mockClear();

    new mod.Logger();

    expect(pinoMock).toHaveBeenCalledTimes(1);
    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'retina-scan-api',
        level: 'debug',
      }),
    );
  });

  it('should log info with message only', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.info('hello');

    expect(pinoInstanceMock.info).toHaveBeenCalledWith('hello');
  });

  it('should log info with data', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.info('hello', { userId: 1 });

    expect(pinoInstanceMock.info).toHaveBeenCalledWith({ userId: 1 }, 'hello');
  });

  it('should log debug', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.debug('debug msg');

    expect(pinoInstanceMock.debug).toHaveBeenCalledWith('debug msg');
  });

  it('should log warn', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.warn('warn msg');

    expect(pinoInstanceMock.warn).toHaveBeenCalledWith('warn msg');
  });

  it('should log error with object', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.error('error msg', { code: 500 });

    expect(pinoInstanceMock.error).toHaveBeenCalledWith({ code: 500 }, 'error msg');
  });

  it('should log error with Error instance', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    const err = new Error('boom');

    logger.error('error msg', err);

    expect(pinoInstanceMock.error).toHaveBeenCalledWith({ err }, 'error msg');
  });

  it('should log fatal with object', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    logger.fatal('fatal msg', { crash: true });

    expect(pinoInstanceMock.fatal).toHaveBeenCalledWith({ crash: true }, 'fatal msg');
  });

  it('should log fatal with Error instance', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    const err = new Error('fatal');

    logger.fatal('fatal msg', err);

    expect(pinoInstanceMock.fatal).toHaveBeenCalledWith({ err }, 'fatal msg');
  });

  it('should return pino instance from getter', async () => {
    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    expect(logger.pino).toBe(pinoInstanceMock);
  });

  it('should create category child logger', async () => {
    const childLogger = { info: vi.fn() };

    pinoInstanceMock.child.mockReturnValue(childLogger);

    const mod = await import('../../../infra/logger/index.js');
    const logger = new mod.Logger();

    const result = logger.category('HTTP');

    expect(pinoInstanceMock.child).toHaveBeenCalledWith({
      category: 'HTTP',
    });

    expect(result).toBe(childLogger);
  });
});
