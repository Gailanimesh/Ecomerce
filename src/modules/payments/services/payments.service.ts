import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Payment } from '../entities/payment.entity';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { PaymentStatus, PaymentFailureCode } from '../enums/payment.enums';
import { PaymentMethods } from '../enums/payment-method.enum';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';

import { OrdersService } from '../../orders/services/orders.service';
import { PAYMENT_GATEWAY } from '../../../integrations/payments/interfaces/payment-gateway.interface';
import type { IPaymentGateway } from '../../../integrations/payments/interfaces/payment-gateway.interface';
import { validatePaymentTransition } from './payment-state-machine';
import { toPaise, toRupees } from '../../../common/utils/money.util';

import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import {
  PaymentResponseDto,
  PaymentInitResponseDto,
  PaginatedPaymentsResponseDto,
} from '../dto/payment-response.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepository: Repository<WebhookEvent>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: any,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sequence 1: Initiates payment workflow for an existing PENDING_PAYMENT order.
   * Ensures external API calls are made OUTSIDE database transactions.
   */
  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<PaymentInitResponseDto> {
    // 1. Validate Order Existence & Ownership
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to user.');
    }

    // 2. Validate Order Status & Payment Expiration Window
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order is in ${order.status} state. Payment initiation requires PENDING_PAYMENT status.`,
      );
    }

    if (order.paymentExpiresAt && new Date() > new Date(order.paymentExpiresAt)) {
      throw new BadRequestException('Order payment time window has expired.');
    }

    const selectedMethod = dto.paymentMethod || order.paymentMethod || PaymentMethods.CARD;
    const provider =
      selectedMethod === PaymentMethods.CASH_ON_DELIVERY
        ? PaymentProvider.MOCK
        : (this.configService.get<PaymentProvider>('payment.provider') || PaymentProvider.RAZORPAY);

    // 3. Create or Fetch Existing Local Payment Entity (Short-lived DB Transaction)
    let payment = await this.paymentRepository.findOne({
      where: { order: { id: order.id } },
    });

    if (!payment) {
      payment = this.paymentRepository.create({
        order: { id: order.id } as Order,
        amount: order.grandTotal,
        method: selectedMethod,
        provider,
        status: PaymentStatus.PENDING,
      });
      payment = await this.paymentRepository.save(payment);
    } else {
      // Validate state machine transition if reusing
      validatePaymentTransition(payment.status, PaymentStatus.PENDING);
      payment.method = selectedMethod;
      payment.provider = provider;
      payment.amount = order.grandTotal;
      payment = await this.paymentRepository.save(payment);
    }

    // 4. Handle Cash on Delivery (COD) Bypass
    if (selectedMethod === PaymentMethods.CASH_ON_DELIVERY) {
      await this.ordersService.confirmPayment(order.id, `COD-${order.orderNumber}`);
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      payment.razorpayOrderId = `COD-${order.orderNumber}`;
      payment.transactionReference = `COD-${order.orderNumber}`;
      await this.paymentRepository.save(payment);

      const amountInPaise = toPaise(order.grandTotal);
      return {
        paymentId: payment.id,
        gatewayOrderId: `COD-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        amountInPaise,
        amount: Number(order.grandTotal),
        currency: 'INR',
        keyId: 'N/A',
        method: selectedMethod,
        provider: PaymentProvider.MOCK,
      };
    }

    // 5. Call External Payment Gateway API (OUTSIDE DB Transaction)
    const amountInPaise = toPaise(order.grandTotal);
    const gatewayOrder = await this.paymentGateway.createGatewayOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountInPaise,
      currency: 'INR',
    });

    // 6. Save Gateway Transaction Reference & Return Initialization Payload
    payment.razorpayOrderId = gatewayOrder.gatewayOrderId;
    payment.transactionReference = gatewayOrder.gatewayOrderId;
    await this.paymentRepository.save(payment);

    const keyId = this.configService.get<string>('payment.keyId') || 'rzp_test_mockkey123';

    return {
      paymentId: payment.id,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      orderNumber: order.orderNumber,
      amountInPaise,
      amount: Number(order.grandTotal),
      currency: gatewayOrder.currency,
      keyId,
      method: selectedMethod,
      provider,
    };
  }

  /**
   * Sequence 2: Verifies client checkout signature and performs double verification against gateway.
   * Strictly idempotent to handle race conditions where webhook arrives first.
   */
  async verifyPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ): Promise<PaymentResponseDto> {
    // 1. Retrieve Local Payment Record & Validate User Ownership
    const payment = await this.paymentRepository.findOne({
      where: { order: { id: dto.orderId } },
      relations: { order: { user: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found for this order.');
    }

    if (payment.order?.user?.id && payment.order.user.id !== userId) {
      throw new ForbiddenException('Order does not belong to authenticated user.');
    }

    // 2. Race Condition Check: Webhook processed first
    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(
        `[verifyPayment] Payment ${payment.id} is already COMPLETED. Returning idempotent response.`,
      );
      return this.mapToPaymentResponseDto(payment);
    }

    // 3. Validate Payment State Machine Transition
    validatePaymentTransition(payment.status, PaymentStatus.COMPLETED);

    // 4. Cryptographic HMAC SHA256 Signature Verification
    const isSignatureValid = this.paymentGateway.verifySignature({
      orderId: dto.orderId,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
    });

    if (!isSignatureValid) {
      payment.status = PaymentStatus.FAILED;
      payment.failureCode = PaymentFailureCode.SIGNATURE_INVALID;
      payment.failureReason = 'Cryptographic signature verification failed.';
      await this.paymentRepository.save(payment);
      await this.ordersService.failPayment(
        payment.order.id,
        'Invalid cryptographic signature.',
      );
      throw new BadRequestException('Payment signature verification failed.');
    }

    // 5. Out-of-Band Double Verification against Gateway API
    try {
      const remoteDetails = await this.paymentGateway.fetchPaymentDetails(
        dto.razorpayPaymentId,
      );

      const expectedPaise = toPaise(payment.amount);
      if (remoteDetails.amountInPaise !== expectedPaise) {
        payment.status = PaymentStatus.FAILED;
        payment.failureCode = PaymentFailureCode.AMOUNT_MISMATCH;
        payment.failureReason = `Gateway amount (${remoteDetails.amountInPaise}) does not match expected amount (${expectedPaise}).`;
        await this.paymentRepository.save(payment);
        await this.ordersService.failPayment(
          payment.order.id,
          'Payment amount mismatch.',
        );
        throw new BadRequestException('Payment verification failed: Amount mismatch.');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(
        `Out-of-band payment detail check skipped or failed: ${err.message}`,
      );
    }

    // 6. Complete Payment & Trigger Order Confirmation Hook inside DB transaction
    const savedPayment = await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      payment.razorpayOrderId = dto.razorpayOrderId;
      payment.razorpayPaymentId = dto.razorpayPaymentId;
      payment.transactionReference = dto.razorpayPaymentId;
      payment.failureCode = undefined;
      payment.failureReason = undefined as any;

      const updated = await manager.save(Payment, payment);
      await this.ordersService.confirmPayment(
        payment.order.id,
        dto.razorpayPaymentId,
        manager,
      );
      return updated;
    });

    return this.mapToPaymentResponseDto(savedPayment);
  }

  /**
   * Sequence 3: Handles incoming Razorpay webhook events with full forensic logging and idempotency.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string,
    headers: Record<string, any>,
  ): Promise<{ status: string; message: string }> {
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid JSON payload in webhook.');
    }

    const eventId = payload.contains?.event_id || payload.event_id || payload.id;
    const eventType = payload.event;

    if (!eventId) {
      throw new BadRequestException('Webhook payload missing event_id.');
    }

    // 1. Verify Cryptographic Webhook HMAC Signature
    const isValid = this.paymentGateway.verifyWebhookSignature(rawBody, signature);

    return this.dataSource.transaction(async (manager) => {
      // 2. Pre-check for existing duplicate eventId in DB
      const existingProcessed = await manager.findOne(WebhookEvent, {
        where: { eventId },
      });

      if (existingProcessed) {
        this.logger.log(`[Webhook] Duplicate event ${eventId} ignored.`);
        return {
          status: existingProcessed.status,
          message: 'Duplicate webhook event ignored.',
        };
      }

      // 3. Create Forensic Webhook Audit Entry
      let webhookEvent = manager.create(WebhookEvent, {
        provider: PaymentProvider.RAZORPAY,
        eventId,
        eventType,
        signature,
        headers,
        payload,
        status: isValid ? WebhookStatus.PROCESSING : WebhookStatus.FAILED,
        failureReason: isValid ? undefined : 'Webhook signature verification failed.',
        receivedAt: new Date(),
      });

      try {
        webhookEvent = await manager.save(WebhookEvent, webhookEvent);
      } catch (err: any) {
        const isDuplicateKeyError =
          err.code === '23505' ||
          err.code === 'ER_DUP_ENTRY' ||
          (err.message &&
            (err.message.includes('unique') ||
              err.message.includes('duplicate') ||
              err.message.includes('eventId')));

        if (isDuplicateKeyError) {
          this.logger.log(
            `[Webhook] Concurrent duplicate event ${eventId} caught by unique constraint.`,
          );
          return { status: 'PROCESSED', message: 'Duplicate event ignored.' };
        }
        throw err;
      }

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature.');
      }

      // 4. Validate handled event types
      const handledEvents = [
        'payment.captured',
        'payment.authorized',
        'payment.failed',
        'refund.processed',
      ];

      if (!handledEvents.includes(eventType)) {
        webhookEvent.status = WebhookStatus.IGNORED;
        webhookEvent.processedAt = new Date();
        await manager.save(WebhookEvent, webhookEvent);
        return {
          status: 'IGNORED',
          message: `Unhandled webhook event type: ${eventType}`,
        };
      }

      // 5. Process Gateway Event Payload
      if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;

        if (razorpayOrderId || razorpayPaymentId) {
          const payment = await manager.findOne(Payment, {
            where: [
              ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
              ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
              ...(razorpayOrderId ? [{ transactionReference: razorpayOrderId }] : []),
              ...(razorpayPaymentId ? [{ transactionReference: razorpayPaymentId }] : []),
            ],
            relations: { order: true },
          });

          if (payment && payment.status !== PaymentStatus.COMPLETED) {
            payment.status = PaymentStatus.COMPLETED;
            payment.paidAt = new Date();
            if (razorpayOrderId) payment.razorpayOrderId = razorpayOrderId;
            if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
            payment.transactionReference = razorpayPaymentId || razorpayOrderId;
            await manager.save(Payment, payment);

            await this.ordersService.confirmPayment(
              payment.order.id,
              razorpayPaymentId || razorpayOrderId,
              manager,
            );
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;

        if (razorpayOrderId || razorpayPaymentId) {
          const payment = await manager.findOne(Payment, {
            where: [
              ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
              ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
              ...(razorpayOrderId ? [{ transactionReference: razorpayOrderId }] : []),
            ],
            relations: { order: true },
          });

          if (payment && payment.status === PaymentStatus.PENDING) {
            payment.status = PaymentStatus.FAILED;
            payment.failureCode = PaymentFailureCode.PAYMENT_DECLINED;
            payment.failureReason =
              paymentEntity?.error_description || 'Payment failed on gateway.';
            if (razorpayOrderId) payment.razorpayOrderId = razorpayOrderId;
            if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
            await manager.save(Payment, payment);

            await this.ordersService.failPayment(
              payment.order.id,
              payment.failureReason,
              manager,
            );
          }
        }
      } else if (eventType === 'refund.processed') {
        const refundEntity = payload.payload?.refund?.entity;
        const razorpayPaymentId = refundEntity?.payment_id;

        if (razorpayPaymentId) {
          const payment = await manager.findOne(Payment, {
            where: [
              { razorpayPaymentId },
              { transactionReference: razorpayPaymentId },
            ],
            relations: { order: true },
          });

          if (payment && payment.status !== PaymentStatus.REFUNDED) {
            payment.status = PaymentStatus.REFUNDED;
            await manager.save(Payment, payment);

            await this.ordersService.refundPayment(
              payment.order.id,
              'Refund processed via gateway webhook.',
              manager,
            );
          }
        }
      }

      webhookEvent.status = WebhookStatus.PROCESSED;
      webhookEvent.processedAt = new Date();
      await manager.save(WebhookEvent, webhookEvent);

      return { status: 'PROCESSED', message: 'Webhook processed successfully.' };
    });
  }

  /**
   * Sequence 4: Admin API to issue refund via gateway.
   */
  async refundPayment(
    paymentId: string,
    dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    // 1. Fetch Payment Record & Validate Status
    const payment = await this.paymentRepository.findOne({
      where: [
        { id: paymentId },
        { razorpayPaymentId: paymentId },
        { transactionReference: paymentId },
      ],
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found.');
    }

    validatePaymentTransition(payment.status, PaymentStatus.REFUNDED);

    // 2. Invoke Gateway Refund API (OUTSIDE DB Transaction, BEFORE DB state updates)
    if (payment.method !== PaymentMethods.CASH_ON_DELIVERY) {
      const amountInPaise = dto.amount ? toPaise(dto.amount) : undefined;
      const refPaymentId =
        payment.razorpayPaymentId || payment.transactionReference || payment.id;
      await this.paymentGateway.processRefund({
        paymentId: refPaymentId,
        amountInPaise,
        reason: dto.reason,
      });
    }

    // 3. Update Payment Status & Order Refund Hook inside isolated DB transaction
    const savedPayment = await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.REFUNDED;
      const updated = await manager.save(Payment, payment);

      await this.ordersService.refundPayment(payment.order.id, dto.reason, manager);

      return updated;
    });

    return this.mapToPaymentResponseDto(savedPayment);
  }

  /**
   * Retrieves payment details for a specific order.
   */
  async getPaymentByOrderId(
    userId: string,
    orderId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { order: { id: orderId } },
      relations: { order: { user: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for order.');
    }

    if (payment.order?.user?.id && payment.order.user.id !== userId) {
      throw new ForbiddenException('Access denied to payment details.');
    }

    return this.mapToPaymentResponseDto(payment);
  }

  /**
   * Admin API: Get single payment by ID.
   */
  async getPaymentById(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: [
        { id: paymentId },
        { razorpayOrderId: paymentId },
        { razorpayPaymentId: paymentId },
        { transactionReference: paymentId },
      ],
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found.');
    }

    return this.mapToPaymentResponseDto(payment);
  }

  /**
   * Admin API: Search & filter paginated payments list.
   */
  async getAllPayments(
    query: PaymentQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order');

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.provider) {
      qb.andWhere('payment.provider = :provider', { provider: query.provider });
    }

    if (query.search) {
      qb.andWhere(
        '(payment.razorpayOrderId ILIKE :search OR payment.razorpayPaymentId ILIKE :search OR payment.transactionReference ILIKE :search OR order.orderNumber ILIKE :search OR payment.id::text ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.startDate) {
      qb.andWhere('payment.createdAt >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      qb.andWhere('payment.createdAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    qb.orderBy('payment.createdAt', 'DESC').skip(skip).take(limit);

    const [payments, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: payments.map((p) => this.mapToPaymentResponseDto(p)),
      meta: { page, limit, totalItems, totalPages },
    };
  }

  private mapToPaymentResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.order?.id,
      orderNumber: payment.order?.orderNumber,
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      transactionReference: payment.transactionReference,
      provider: payment.provider,
      paidAt: payment.paidAt,
      failureCode: payment.failureCode,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
