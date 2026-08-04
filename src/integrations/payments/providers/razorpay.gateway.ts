import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { PaymentGatewayException } from '../exceptions/gateway.exception';

@Injectable()
export class RazorpayGateway implements IPaymentGateway {
  private readonly logger = new Logger(RazorpayGateway.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('payment.keyId') || '';
    this.keySecret = this.configService.get<string>('payment.keySecret') || '';
    this.webhookSecret =
      this.configService.get<string>('payment.webhookSecret') || '';
  }

  /**
   * Creates a Razorpay Order using Razorpay REST API with retry backoff.
   */
  async createGatewayOrder(
    params: CreateGatewayOrderParams,
  ): Promise<GatewayOrderResponse> {
    const payload = {
      amount: params.amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.orderNumber,
      notes: {
        orderId: params.orderId,
        ...params.notes,
      },
    };

    const res = await this.requestWithRetry('/orders', 'POST', payload);

    return {
      gatewayOrderId: res.id,
      amount: res.amount,
      currency: res.currency,
      receipt: res.receipt,
      status: res.status,
      rawResponse: res,
    };
  }

  /**
   * Cryptographically verifies Razorpay Checkout HMAC SHA256 signature.
   * payload = razorpay_order_id + "|" + razorpay_payment_id
   */
  verifySignature(params: VerifySignatureParams): boolean {
    try {
      const generatedSignature = createHmac('sha256', this.keySecret)
        .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
        .digest('hex');

      return generatedSignature === params.razorpaySignature;
    } catch (error) {
      this.logger.error(`Razorpay signature verification error`, error);
      return false;
    }
  }

  /**
   * Cryptographically verifies Razorpay Webhook HMAC SHA256 signature against raw request body buffer.
   */
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    secret?: string,
  ): boolean {
    try {
      const targetSecret = secret || this.webhookSecret;
      const expectedSignature = createHmac('sha256', targetSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error(`Webhook signature verification error`, error);
      return false;
    }
  }

  /**
   * Out-of-band verification fetching remote payment state directly from Razorpay API.
   */
  async fetchPaymentDetails(
    gatewayPaymentId: string,
  ): Promise<GatewayPaymentDetails> {
    const res = await this.requestWithRetry(`/payments/${gatewayPaymentId}`, 'GET');

    return {
      paymentId: res.id,
      orderId: res.order_id,
      amountInPaise: res.amount,
      currency: res.currency,
      status: res.status,
      method: res.method,
      email: res.email,
      contact: res.contact,
      rawResponse: res,
    };
  }

  /**
   * Processes a refund via Razorpay REST API.
   */
  async processRefund(
    params: ProcessRefundParams,
  ): Promise<GatewayRefundResponse> {
    const payload: any = {
      notes: params.notes,
    };
    if (params.amountInPaise) {
      payload.amount = params.amountInPaise;
    }

    const res = await this.requestWithRetry(
      `/payments/${params.paymentId}/refund`,
      'POST',
      payload,
    );

    return {
      refundId: res.id,
      paymentId: res.payment_id,
      amountInPaise: res.amount,
      status: res.status,
      rawResponse: res,
    };
  }

  /**
   * Private helper to execute HTTP requests with 3 retries & exponential backoff.
   */
  private async requestWithRetry(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
    maxRetries = 3,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeader = `Basic ${Buffer.from(
      `${this.keyId}:${this.keySecret}`,
    ).toString('base64')}`;

    let attempts = 0;
    let delayMs = 500;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new PaymentGatewayException(
            data.error?.description || `Razorpay API error (${response.status})`,
            data,
          );
        }

        return data;
      } catch (error: any) {
        if (error instanceof PaymentGatewayException) {
          throw error;
        }

        this.logger.warn(
          `Razorpay request failed (Attempt ${attempts}/${maxRetries}): ${error.message}`,
        );

        if (attempts >= maxRetries) {
          throw new PaymentGatewayException(
            `Razorpay service unavailable after ${maxRetries} attempts.`,
            error,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
}
