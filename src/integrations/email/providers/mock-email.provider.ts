import { Injectable, Logger } from '@nestjs/common';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { SendEmailInput, SendEmailResult } from '../types/email.types';

export interface SentEmailRecord extends SendEmailInput {
  messageId: string;
  timestamp: Date;
}

@Injectable()
export class MockEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);
  private readonly sentEmails: SentEmailRecord[] = [];

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const messageId = `mock-email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const record: SentEmailRecord = {
      ...input,
      messageId,
      timestamp: new Date(),
    };

    this.sentEmails.push(record);

    this.logger.log(
      `[EMAIL_SENT] provider=mock to=${input.to} subject="${input.subject}" messageId=${messageId}`,
    );

    return {
      success: true,
      messageId,
    };
  }

  // Internal test helpers
  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  getSentEmailsByRecipient(to: string): SentEmailRecord[] {
    return this.sentEmails.filter((e) => e.to.toLowerCase() === to.toLowerCase());
  }

  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }
}
