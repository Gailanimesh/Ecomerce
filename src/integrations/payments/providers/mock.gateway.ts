import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import {
  CreateGatewayOrderParams,
  GatewayOrderResponse,
  VerifySignatureParams,
  GatewayPaymentDetails,
  ProcessRefundParams,
  GatewayRefundResponse,
} from '../types/payment-gateway.types';

@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);
  private readonly mockSecret = 'mock_secret_key_456';
  private static lastCreatedAmountInPaise: number = 0;

  private readonly orderStore = new Map<string, number>();

  async createGatewayOrder(
    params: CreateGatewayOrderParams,
  ): Promise<GatewayOrderResponse> {
    const mockGatewayOrderId = `order_mock_${Date.now().toString(36)}`;
    this.orderStore.set(mockGatewayOrderId, params.amountInPaise);
    MockPaymentGateway.lastCreatedAmountInPaise = params.amountInPaise;
    this.logger.log(`[MockGateway] Created gateway order: ${mockGatewayOrderId}`);

    const rawResponse = {
      id: mockGatewayOrderId,
      entity: 'order',
      amount: params.amountInPaise,
      amount_paid: 0,
      amount_due: params.amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.orderNumber,
      offer_id: null,
      status: 'created',
      attempts: 0,
      notes: params.notes || {},
      created_at: Math.floor(Date.now() / 1000),
    };

    return {
      gatewayOrderId: mockGatewayOrderId,
      amount: params.amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.orderNumber,
      status: 'created',
      rawResponse,
    };
  }

  verifySignature(params: VerifySignatureParams): boolean {
    if (params.razorpaySignature === 'mock_invalid_signature') {
      return false;
    }
    // Accept valid HMAC or fallback test signature
    if (params.razorpaySignature === 'mock_valid_signature') {
      return true;
    }

    try {
      const generated = createHmac('sha256', this.mockSecret)
        .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
        .digest('hex');
      return generated === params.razorpaySignature;
    } catch {
      return true; // Fallback for mock dev test payloads
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    secret?: string,
  ): boolean {
    if (signature === 'mock_invalid_signature') return false;
    if (signature === 'mock_valid_signature') return true;

    try {
      const targetSecret = secret || this.mockSecret;
      const expected = createHmac('sha256', targetSecret)
        .update(rawBody)
        .digest('hex');
      return expected === signature;
    } catch {
      return true;
    }
  }

  async fetchPaymentDetails(
    gatewayPaymentId: string,
  ): Promise<GatewayPaymentDetails> {
    this.logger.log(`[MockGateway] Fetched payment details for ${gatewayPaymentId}`);
    
    // Use last created order amount if available, otherwise 49950
    const recordedAmount =
      MockPaymentGateway.lastCreatedAmountInPaise > 0
        ? MockPaymentGateway.lastCreatedAmountInPaise
        : (Array.from(this.orderStore.values()).pop() || 49950);

    const rawResponse = {
      id: gatewayPaymentId,
      entity: 'payment',
      amount: recordedAmount,
      currency: 'INR',
      status: 'captured',
      order_id: 'order_mock_test',
      invoice_id: null,
      international: false,
      method: 'card',
      amount_refunded: 0,
      refund_status: null,
      captured: true,
      description: 'Mock Payment Execution',
      card_id: 'card_mock_123',
      bank: null,
      wallet: null,
      vpa: null,
      email: 'customer@example.com',
      contact: '+919999999999',
      notes: {},
      fee: 999,
      tax: 180,
      error_code: null,
      error_description: null,
      created_at: Math.floor(Date.now() / 1000),
    };

    return {
      paymentId: gatewayPaymentId,
      orderId: 'order_mock_test',
      amountInPaise: recordedAmount,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      email: 'customer@example.com',
      contact: '+919999999999',
      rawResponse,
    };
  }

  async processRefund(
    params: ProcessRefundParams,
  ): Promise<GatewayRefundResponse> {
    const mockRefundId = `rfnd_mock_${Date.now().toString(36)}`;
    this.logger.log(`[MockGateway] Processed refund ${mockRefundId} for ${params.paymentId}`);

    const rawResponse = {
      id: mockRefundId,
      entity: 'refund',
      amount: params.amountInPaise || 49950,
      currency: 'INR',
      payment_id: params.paymentId,
      notes: params.notes || {},
      receipt: null,
      acquirer_data: {
        rrn: '123456789012',
      },
      created_at: Math.floor(Date.now() / 1000),
      batch_id: null,
      status: 'processed',
    };

    return {
      refundId: mockRefundId,
      paymentId: params.paymentId,
      amountInPaise: params.amountInPaise || 49950,
      status: 'processed',
      rawResponse,
    };
  }
}
