export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}
