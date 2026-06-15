import type { Job } from 'bullmq';
import { container } from '@/infra/container';
import logger from '@/infra/logger';

export type SendInviteEmailJobData = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendInviteEmailWorker(job: Job): Promise<void> {
  const data = job.data as SendInviteEmailJobData;
  logger.info('Sending invite email', { jobId: job.id, to: data.to });

  const emailProvider = container.resolve('nodeMailerEmailProvider');
  await emailProvider.send({
    to: data.to,
    subject: data.subject,
    html: data.html,
    text: data.text,
  });
}
