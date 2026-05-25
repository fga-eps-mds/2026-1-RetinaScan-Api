export interface MessageBrokerInput {
  queueName: string;
  payload: unknown;
}

export interface MessageBroker {
  publish(input: MessageBrokerInput): Promise<void>;
}
