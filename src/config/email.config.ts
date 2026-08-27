import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  provider: 'mock' | 'resend';
  from: string;
  fromName: string;
  apiKey?: string;
}

export default registerAs('email', (): EmailConfig => {
  const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase() as 'mock' | 'resend';
  const from = process.env.EMAIL_FROM || 'noreply@store.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'E-Commerce Store';
  const apiKey = process.env.EMAIL_API_KEY;

  if (provider === 'resend' && !apiKey) {
    throw new Error('EMAIL_API_KEY environment variable is required when EMAIL_PROVIDER is set to "resend".');
  }

  return {
    provider,
    from,
    fromName,
    apiKey,
  };
});
