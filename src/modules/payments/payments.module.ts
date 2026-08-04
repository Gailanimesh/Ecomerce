import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Order } from '../orders/entities/order.entity';

import { OrdersModule } from '../orders/orders.module';
import { PaymentsIntegrationModule } from '../../integrations/payments/payments-integration.module';

import { PaymentsService } from './services/payments.service';
import { PaymentExpirationService } from './services/payment-expiration.service';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, WebhookEvent, Order]),
    OrdersModule,
    PaymentsIntegrationModule,
  ],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaymentExpirationService],
  exports: [PaymentsService, PaymentExpirationService],
})
export class PaymentsModule {}
