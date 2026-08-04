import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';
import { RazorpayGateway } from './providers/razorpay.gateway';
import { MockPaymentGateway } from './providers/mock.gateway';

@Module({
  imports: [ConfigModule],
  providers: [
    RazorpayGateway,
    MockPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (
        configService: ConfigService,
        razorpayGateway: RazorpayGateway,
        mockGateway: MockPaymentGateway,
      ) => {
        const provider = configService.get<string>('payment.provider')?.toLowerCase();
        const keyId = configService.get<string>('payment.keyId');

        if (provider === 'mock' || !keyId || keyId === 'rzp_test_mockkey123') {
          return mockGateway;
        }

        return razorpayGateway;
      },
      inject: [ConfigService, RazorpayGateway, MockPaymentGateway],
    },
  ],
  exports: [PAYMENT_GATEWAY, RazorpayGateway, MockPaymentGateway],
})
export class PaymentsIntegrationModule {}
