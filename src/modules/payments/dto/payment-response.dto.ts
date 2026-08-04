import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentFailureCode } from '../enums/payment.enums';
import { PaymentMethods } from '../enums/payment-method.enum';
import { PaymentProvider } from '../enums/payment-provider.enum';

export class PaymentInitResponseDto {
  @ApiProperty({ example: 'pay_a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  paymentId!: string;

  @ApiProperty({ example: 'order_Nx1234567890' })
  gatewayOrderId!: string;

  @ApiProperty({ example: 'ORD-20260801-A7F9B2' })
  orderNumber!: string;

  @ApiProperty({ example: 49950, description: 'Amount in paise' })
  amountInPaise!: number;

  @ApiProperty({ example: 499.5, description: 'Amount in Rupees' })
  amount!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'rzp_test_mockkey123' })
  keyId!: string;

  @ApiProperty({ enum: PaymentMethods })
  method!: PaymentMethods;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;
}

export class PaymentResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'b1ffcd88-8b0a-3ef7-aa5c-5aa8ac270a00' })
  orderId!: string;

  @ApiProperty({ example: 'ORD-20260801-A7F9B2' })
  orderNumber?: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ enum: PaymentMethods })
  method!: PaymentMethods;

  @ApiProperty({ example: 499.5 })
  amount!: number;

  @ApiPropertyOptional({ example: 'pay_Nx9876543210' })
  transactionReference?: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiPropertyOptional({ example: '2026-08-04T01:30:00Z' })
  paidAt?: Date;

  @ApiPropertyOptional({ enum: PaymentFailureCode })
  failureCode?: PaymentFailureCode;

  @ApiPropertyOptional({ example: 'Invalid payment signature' })
  failureReason?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items!: PaymentResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 10, totalItems: 42, totalPages: 5 },
  })
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
