import { SendEmailInput, SendEmailResult } from '../types/email.types';

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export interface IEmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
