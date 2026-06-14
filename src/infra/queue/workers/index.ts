import { BullMQ } from '../bullmq';
import { QueueNames } from '../types';
import { processImagesWorker } from './process-images-worker';
import { sendInviteEmailWorker } from './send-invite-email-worker';

function createWorkers(): void {
  const bullMQ = BullMQ.getInstance();

  bullMQ.addWorker(QueueNames.processImages, processImagesWorker, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2_000 },
  });

  bullMQ.addWorker(QueueNames.sendInviteEmail, sendInviteEmailWorker, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
  });
}

export { createWorkers };
