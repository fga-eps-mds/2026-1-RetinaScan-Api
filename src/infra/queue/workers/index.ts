import { BullMQ } from '../bullmq';
import { QueueNames } from '../types';
import { processImagesWorker } from './process-images-worker';

function createWorkers(): void {
  const bullMQ = BullMQ.getInstance();

  bullMQ.addWorker(QueueNames.processImages, processImagesWorker, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2_000 },
  });
}

export { createWorkers };
