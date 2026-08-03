import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentMethods } from '../../payments/enums/payment-method.enum';

export class OrderQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1).',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of order records per page.',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Search query matching Order Number, Customer Name, Recipient Name, Recipient Phone, Product Name, or SKU.',
    example: 'ORD-20260801',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders by lifecycle status.',
    enum: OrderStatus,
    example: OrderStatus.PENDING_PAYMENT,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Filter orders by payment method.',
    enum: PaymentMethods,
    example: PaymentMethods.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethods)
  paymentMethod?: PaymentMethods;

  @ApiPropertyOptional({
    description: 'Filter orders created on or after this ISO date-time.',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders created on or before this ISO date-time.',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders updated on or after this ISO date-time.',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  updatedStartDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders updated on or before this ISO date-time.',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  updatedEndDate?: string;

  @ApiPropertyOptional({
    description: 'Field to sort order records by.',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sorting direction.',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
