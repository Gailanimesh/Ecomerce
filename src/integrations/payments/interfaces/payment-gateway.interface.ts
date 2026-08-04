import {
  CreateGatewayOrderParams,
  GatewayOrderResponse,
  VerifySignatureParams,
  GatewayPaymentDetails,
  ProcessRefundParams,
  GatewayRefundResponse,
} from '../types/payment-gateway.types';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface IPaymentGateway {
  createGatewayOrder(
    params: CreateGatewayOrderParams,
  ): Promise<GatewayOrderResponse>;

  verifySignature(params: VerifySignatureParams): boolean;

  verifyWebhookSignature(rawBody: Buffer, signature: string, secret?: string): boolean;

  fetchPaymentDetails(
    gatewayPaymentId: string,
  ): Promise<GatewayPaymentDetails>;

  processRefund(
    params: ProcessRefundParams,
  ): Promise<GatewayRefundResponse>;
}
