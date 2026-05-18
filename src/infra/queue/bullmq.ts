import { env } from '@/env';
import { Queue, Worker, type Job, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export class BullMQ {
  private static instance: BullMQ | undefined;
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker>;
  private connection: IORedis;

  private constructor() {
    this.connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queues = new Map();
    this.workers = new Map();
  }

  public static getInstance(): BullMQ {
    if (!BullMQ.instance) {
      BullMQ.instance = new BullMQ();
    }

    return BullMQ.instance;
  }

  public createQueue(name: string, defaultJobOptions?: JobsOptions): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
          ...defaultJobOptions,
        },
      });
      this.queues.set(name, queue);
    }

    return this.queues.get(name)!;
  }

  public async addJob<T>(queueName: string, data: T, opts?: JobsOptions): Promise<void> {
    const queue = this.createQueue(queueName);
    await queue.add(queueName, data, opts);
  }

  public addWorker(
    queueName: string,
    callback: (job: Job) => Promise<void>,
    jobOptions?: JobsOptions,
  ): void {
    if (this.workers.has(queueName)) {
      return;
    }

    this.createQueue(queueName, jobOptions);

    const worker = new Worker(queueName, callback, { connection: this.connection });

    this.workers.set(queueName, worker);
  }

  public async close(): Promise<void> {
    await Promise.all([
      ...Array.from(this.workers.values()).map((worker) => worker.close()),
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
    ]);

    await this.connection.quit();
  }
}
