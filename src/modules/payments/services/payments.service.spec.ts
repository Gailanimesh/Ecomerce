import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { Payment } from '../entities/payment.entity';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrdersService } from '../../orders/services/orders.service';
import { PAYMENT_GATEWAY } from '../../../integrations/payments/interfaces/payment-gateway.interface';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../enums/payment.enums';
import { WebhookStatus } from '../enums/webhook-status.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: any;
  let webhookEventRepository: any;
  let orderRepository: any;
  let ordersService: any;
  let paymentGateway: any;
  let dataSource: any;
  let configService: any;

  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn((entityClass, dto) => ({ ...dto, id: 'mock-uuid-123' })),
      save: jest.fn((entityClass, entity) => Promise.resolve(entity || entityClass)),
    };

    paymentRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    webhookEventRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    orderRepository = {
      findOne: jest.fn(),
    };

    ordersService = {
      confirmPayment: jest.fn().mockResolvedValue({}),
      failPayment: jest.fn().mockResolvedValue({}),
      refundPayment: jest.fn().mockResolvedValue({}),
    };

    paymentGateway = {
      createGatewayOrder: jest.fn().mockResolvedValue({ gatewayOrderId: 'order_123', currency: 'INR' }),
      verifySignature: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      fetchPaymentDetails: jest.fn().mockResolvedValue({ amountInPaise: 1000 }),
      processRefund: jest.fn().mockResolvedValue({ refundId: 'rfnd_123' }),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => cb(mockEntityManager)),
    };

    configService = {
      get: jest.fn().mockReturnValue('mock-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: getRepositoryToken(WebhookEvent), useValue: webhookEventRepository },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: OrdersService, useValue: ordersService },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('handleWebhook', () => {
    it('should process payment.captured event atomically inside a transaction', async () => {
      const payload = {
        event_id: 'evt_1001',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { order_id: 'order_rzp_123', id: 'pay_rzp_456' },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = 'valid-sig';

      mockEntityManager.findOne.mockImplementation((entityClass: any, options: any) => {
        if (entityClass === WebhookEvent) return Promise.resolve(null);
        if (entityClass === Payment) {
          return Promise.resolve({
            id: 'pay_local_1',
            status: PaymentStatus.PENDING,
            order: { id: 'ord_local_1' },
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.handleWebhook(rawBody, signature, {});

      expect(result).toEqual({ status: 'PROCESSED', message: 'Webhook processed successfully.' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(ordersService.confirmPayment).toHaveBeenCalledWith('ord_local_1', 'pay_rzp_456', mockEntityManager);
    });

    it('should mark unhandled event types as IGNORED instead of PROCESSED', async () => {
      const payload = {
        event_id: 'evt_1002',
        event: 'order.paid',
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await service.handleWebhook(rawBody, 'valid-sig', {});

      expect(result.status).toEqual('IGNORED');
      expect(result.message).toContain('Unhandled webhook event type');
    });

    it('should catch database UNIQUE constraint error (23505) on eventId and exit gracefully', async () => {
      const payload = {
        event_id: 'evt_dup_999',
        event: 'payment.captured',
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.save.mockImplementation((entityClass: any, entity: any) => {
        if (entityClass === WebhookEvent || entity?.eventId) {
          const dbErr: any = new Error('duplicate key value violates unique constraint "webhook_events_eventId_key"');
          dbErr.code = '23505';
          throw dbErr;
        }
        return Promise.resolve(entity);
      });

      const result = await service.handleWebhook(rawBody, 'valid-sig', {});

      expect(result).toEqual({ status: 'PROCESSED', message: 'Duplicate event ignored.' });
    });

    it('should rethrow unrelated database exceptions during webhook processing', async () => {
      const payload = {
        event_id: 'evt_err_500',
        event: 'payment.captured',
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.save.mockRejectedValue(new Error('DB Connection Lost'));

      await expect(service.handleWebhook(rawBody, 'valid-sig', {})).rejects.toThrow('DB Connection Lost');
    });
  });

  describe('refundPayment', () => {
    it('should execute Razorpay gateway API call BEFORE opening DB transaction', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_123',
        status: PaymentStatus.COMPLETED,
        razorpayPaymentId: 'pay_rzp_789',
        method: 'CARD',
        order: { id: 'ord_123' },
      });

      let gatewayCalledFirst = false;
      paymentGateway.processRefund.mockImplementation(async () => {
        gatewayCalledFirst = true;
        return { refundId: 'ref_123' };
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        expect(gatewayCalledFirst).toBe(true);
        return cb(mockEntityManager);
      });

      await service.refundPayment('pay_123', { reason: 'Customer requested' });

      expect(paymentGateway.processRefund).toHaveBeenCalledWith({
        paymentId: 'pay_rzp_789',
        amountInPaise: undefined,
        reason: 'Customer requested',
      });
      expect(ordersService.refundPayment).toHaveBeenCalledWith('ord_123', 'Customer requested', mockEntityManager);
    });
  });
});
