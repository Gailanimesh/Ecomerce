import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCouponDto {
  @ApiPropertyOptional({
    description: 'Human-readable description of the coupon promotion.',
    example: 'Updated promotion description.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Maximum discount cap amount (in currency units, e.g. ₹500) applicable for PERCENTAGE discounts.',
    example: 600,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    description:
      'Minimum order subtotal required to apply this coupon.',
    example: 1200,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minimumOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'ISO-8601 timestamp when the coupon becomes valid.',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 timestamp when the coupon expires.',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description:
      'Global maximum number of times this coupon can be used across all customers.',
    example: 200,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({
    description:
      'Maximum number of times an individual customer can use this coupon.',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  perUserUsageLimit?: number;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
