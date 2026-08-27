import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from './interfaces/email-provider.interface';
import { MockEmailProvider } from './providers/mock-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MockEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockEmailProvider,
        resendProvider: ResendEmailProvider,
      ) => {
        const provider = configService.get<string>('email.provider')?.toLowerCase();
        if (provider === 'resend') {
          return resendProvider;
        }
        return mockProvider;
      },
      inject: [ConfigService, MockEmailProvider, ResendEmailProvider],
    },
  ],
  exports: [EMAIL_PROVIDER, MockEmailProvider, ResendEmailProvider],
})
export class EmailIntegrationModule {}
