import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { SendEmailInput, SendEmailResult } from '../types/email.types';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string | undefined;
  private readonly defaultFrom: string;
  private readonly defaultFromName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('email.apiKey');
    this.defaultFrom = this.configService.get<string>('email.from') || 'noreply@store.com';
    this.defaultFromName = this.configService.get<string>('email.fromName') || 'E-Commerce Store';
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.apiKey) {
      const errorMsg = 'Resend API key is not configured.';
      this.logger.error(`[EMAIL_FAILED] provider=resend to=${input.to} error="${errorMsg}"`);
      return { success: false, error: errorMsg };
    }

    const fromAddress = input.from
      ? input.fromName
        ? `${input.fromName} <${input.from}>`
        : input.from
      : `${this.defaultFromName} <${this.defaultFrom}>`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: input.replyTo,
          tags: input.metadata
            ? Object.entries(input.metadata).map(([name, value]) => ({
                name,
                value: String(value),
              }))
            : undefined,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        const errorMsg = data?.message || `Resend API returned status ${response.status}`;
        this.logger.error(`[EMAIL_FAILED] provider=resend to=${input.to} error="${errorMsg}"`);
        return { success: false, error: errorMsg };
      }

      const messageId = data?.id || 'resend-ok';
      this.logger.log(
        `[EMAIL_SENT] provider=resend to=${input.to} subject="${input.subject}" messageId=${messageId}`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      const errorMsg = error?.message || 'Network error connecting to Resend API';
      this.logger.error(`[EMAIL_ERROR] provider=resend to=${input.to} error="${errorMsg}"`);
      return { success: false, error: errorMsg };
    }
  }
}
