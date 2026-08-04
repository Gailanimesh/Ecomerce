import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus, PaymentFailureCode } from '../enums/payment.enums';
import { OrdersService } from '../../orders/services/orders.service';
import { validatePaymentTransition } from './payment-state-machine';

@Injectable()
export class PaymentExpirationService {
  private readonly logger = new Logger(PaymentExpirationService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Standalone service hook to query and expire stale pending payments.
   * Ready to be invoked by cron, BullMQ, or NestJS scheduler.
   */
  async expirePendingPayments(): Promise<number> {
    const now = new Date();

    const expiredPayments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.PENDING,
        order: {
          paymentExpiresAt: LessThan(now),
        },
      },
      relations: {
        order: true,
      },
    });

    if (expiredPayments.length === 0) {
      return 0;
    }

    this.logger.log(`Found ${expiredPayments.length} pending payments past expiration.`);

    let count = 0;
    for (const payment of expiredPayments) {
      try {
        await this.dataSource.transaction(async (manager) => {
          validatePaymentTransition(payment.status, PaymentStatus.EXPIRED);
          payment.status = PaymentStatus.EXPIRED;
          payment.failureCode = PaymentFailureCode.PAYMENT_TIMEOUT;
          payment.failureReason = 'Payment window expired before completion.';
          await manager.save(Payment, payment);

          if (payment.order && payment.order.id) {
            await this.ordersService.expirePendingPayment(payment.order.id);
          }
        });
        count++;
      } catch (err: any) {
        this.logger.error(
          `Failed to expire payment ID ${payment.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    return count;
  }
}
