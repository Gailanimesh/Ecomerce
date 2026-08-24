import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../enums/discount-type.enum';

export class CouponResponseDto {
  @ApiProperty({ example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6' })
  id!: string;

  @ApiProperty({ example: 'SAVE20' })
  code!: string;

  @ApiPropertyOptional({ example: '20% off on all items above ₹1,000.' })
  description?: string | null;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 500 })
  maxDiscountAmount?: number | null;

  @ApiProperty({ example: 1000 })
  minimumOrderAmount!: number;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  startsAt!: Date;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  expiresAt!: Date;

  @ApiPropertyOptional({ example: 100 })
  usageLimit?: number | null;

  @ApiProperty({ example: 5 })
  usedCount!: number;

  @ApiProperty({ example: 1 })
  perUserUsageLimit!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedCouponsResponseDto {
  @ApiProperty({ type: [CouponResponseDto] })
  items!: CouponResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class CartCouponPreviewDto {
  @ApiProperty({ example: 'SAVE20' })
  couponCode!: string;

  @ApiPropertyOptional({ example: '20% off on all items above ₹1,000.' })
  description?: string | null;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiProperty({
    example: 200,
    description: 'Authoritative discount amount in standard currency units (Rupees).',
  })
  discount!: number;

  @ApiProperty({
    example: 1000,
    description: 'Cart subtotal before discount in standard currency units (Rupees).',
  })
  subtotal!: number;

  @ApiProperty({
    example: 800,
    description:
      'Cart total after discount in standard currency units (Rupees). Note: Shipping and taxes will be added at checkout.',
  })
  totalAfterDiscount!: number;
}

export class CouponUsageResponseDto {
  @ApiProperty({ example: '3c6d9235-8ace-4f88-8b3f-a2791c117bf1' })
  id!: string;

  @ApiProperty({ example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6' })
  couponId!: string;

  @ApiProperty({ example: '5be850fc-bf12-4460-8b93-365027742434' })
  userId!: string;

  @ApiProperty({ example: 'f5967c42-8d24-4fe6-8cac-95df9935abee' })
  orderId!: string;

  @ApiProperty({ example: 200 })
  discountAmount!: number;

  @ApiProperty({ example: '2026-08-19T05:47:56.494Z' })
  createdAt!: Date;
}

export class PaginatedCouponUsagesResponseDto {
  @ApiProperty({ type: [CouponUsageResponseDto] })
  items!: CouponUsageResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}
