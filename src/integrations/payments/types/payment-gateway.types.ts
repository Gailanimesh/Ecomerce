export interface CreateGatewayOrderParams {
  orderId: string;
  orderNumber: string;
  amountInPaise: number;
  currency?: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResponse {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  rawResponse?: any;
}

export interface VerifySignatureParams {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface GatewayPaymentDetails {
  paymentId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  rawResponse?: any;
}

export interface ProcessRefundParams {
  paymentId: string;
  amountInPaise?: number;
  reason?: string;
  notes?: Record<string, string>;
}

export interface GatewayRefundResponse {
  refundId: string;
  paymentId: string;
  amountInPaise: number;
  status: string;
  rawResponse?: any;
}
