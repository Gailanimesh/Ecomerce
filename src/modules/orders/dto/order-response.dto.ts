import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentMethods } from '../../payments/enums/payment-method.enum';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'b1e847c1-8d2a-4a6f-b1e8-789a6c11d2e3' })
  id!: string;

  @ApiPropertyOptional({ example: 'f3a91823-74b8-4c12-990a-112233445566' })
  productVariantId?: string;

  @ApiProperty({ example: 'Ergonomic Wireless Gaming Mouse' })
  productName!: string;

  @ApiPropertyOptional({ example: 'ergonomic-wireless-gaming-mouse' })
  productSlug?: string;

  @ApiPropertyOptional({ example: 'Matte Black / 16000 DPI' })
  variantName?: string;

  @ApiPropertyOptional({
    example: { color: 'Matte Black', dpi: 16000 },
    type: 'object',
    additionalProperties: true,
  })
  variantAttributes?: Record<string, any>;

  @ApiProperty({ example: 'MS-WRLS-BLK-01' })
  sku!: string;

  @ApiPropertyOptional({ example: 'LogiTech Pro' })
  brandName?: string;

  @ApiPropertyOptional({ example: 'Computer Accessories' })
  categoryName?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.store.com/products/mouse-black.jpg',
  })
  thumbnail?: string;

  @ApiProperty({ example: 49.99 })
  unitPrice!: number;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 99.98 })
  subtotal!: number;
}

export class OrderHistoryResponseDto {
  @ApiProperty({ example: 'c9d8e7f6-5a4b-3c2d-1e0f-9a8b7c6d5e4f' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @ApiPropertyOptional({ example: 'u1122334-4455-6677-8899-aabbccddeeff' })
  changedByUserId?: string;

  @ApiProperty({ example: 'CUSTOMER' })
  changedByRole!: string;

  @ApiPropertyOptional({ example: 'CHECKOUT_CREATED' })
  changeReason?: string;

  @ApiPropertyOptional({ example: 'Order placed by user via active cart checkout.' })
  notes?: string;

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  createdAt!: Date;
}

export class AddressSnapshotDto {
  @ApiProperty({ example: 'Jane Doe' })
  recipientName!: string;

  @ApiProperty({ example: '+1-555-019-2834' })
  recipientPhone!: string;

  @ApiProperty({ example: '742 Evergreen Terrace' })
  shippingAddressLine1!: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  shippingAddressLine2?: string;

  @ApiProperty({ example: 'Springfield' })
  shippingCity!: string;

  @ApiProperty({ example: 'Oregon' })
  shippingState!: string;

  @ApiProperty({ example: 'United States' })
  shippingCountry!: string;

  @ApiProperty({ example: '97477' })
  shippingPostalCode!: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'e71829ab-1234-4567-890a-bcdef1234567' })
  id!: string;

  @ApiProperty({ example: 'ORD-20260801-102938' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @ApiProperty({ example: 99.98 })
  subtotal!: number;

  @ApiProperty({ example: 0.0 })
  discount!: number;

  @ApiProperty({ example: 0.0 })
  shippingFee!: number;

  @ApiProperty({ example: 0.0 })
  tax!: number;

  @ApiProperty({ example: 99.98 })
  grandTotal!: number;

  @ApiPropertyOptional({ enum: PaymentMethods, example: PaymentMethods.CARD })
  paymentMethod?: PaymentMethods;

  @ApiPropertyOptional({ example: '2026-08-01T14:55:00.000Z' })
  paymentExpiresAt?: Date;

  @ApiProperty({ type: AddressSnapshotDto })
  shippingAddress!: AddressSnapshotDto;

  @ApiPropertyOptional({ example: 'Special instructions for delivery' })
  notes?: string;

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  placedAt!: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiPropertyOptional({ type: [OrderHistoryResponseDto] })
  history?: OrderHistoryResponseDto[];

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  updatedAt!: Date;
}

export class OrderSummaryResponseDto {
  @ApiProperty({ example: 'e71829ab-1234-4567-890a-bcdef1234567' })
  id!: string;

  @ApiProperty({ example: 'ORD-20260801-102938' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @ApiProperty({ example: 99.98 })
  grandTotal!: number;

  @ApiProperty({ example: 2 })
  totalItems!: number;

  @ApiPropertyOptional({ enum: PaymentMethods, example: PaymentMethods.CARD })
  paymentMethod?: PaymentMethods;

  @ApiProperty({ example: 'Jane Doe' })
  recipientName!: string;

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  placedAt!: Date;

  @ApiProperty({ example: '2026-08-01T14:40:00.000Z' })
  createdAt!: Date;
}

export class CheckoutNextActionDto {
  @ApiProperty({ example: true })
  paymentRequired!: boolean;

  @ApiPropertyOptional({ enum: PaymentMethods, example: PaymentMethods.CARD })
  paymentMethod?: PaymentMethods;
}

export class CheckoutResponseDto {
  @ApiProperty({ type: OrderResponseDto })
  order!: OrderResponseDto;

  @ApiProperty({ type: CheckoutNextActionDto })
  nextAction!: CheckoutNextActionDto;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderSummaryResponseDto] })
  items!: OrderSummaryResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      totalItems: 42,
      totalPages: 5,
    },
  })
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
