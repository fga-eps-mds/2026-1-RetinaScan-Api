import type { MessageBroker, MessageBrokerInput } from '@/shared/services';
import { BullMQ } from './bullmq';

export class BullMQMessageBroker implements MessageBroker {
  async publish(input: MessageBrokerInput): Promise<void> {
    const { queueName, payload } = input;

    const bullMQ = BullMQ.getInstance();
    await bullMQ.addJob(queueName, payload);
  }
}
