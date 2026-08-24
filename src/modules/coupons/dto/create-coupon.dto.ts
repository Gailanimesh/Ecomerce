import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '../enums/discount-type.enum';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Unique uppercase coupon code (alphanumeric, hyphens, underscores).',
    example: 'SAVE20',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Coupon code must contain only uppercase letters, numbers, underscores, or hyphens.',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'Human-readable description of the coupon promotion.',
    example: '20% off on all footwear purchases above ₹1,000.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    description: 'Type of discount: PERCENTAGE or FIXED_AMOUNT.',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType!: DiscountType;

  @ApiProperty({
    description:
      'Value of the discount. If PERCENTAGE, must be between 0.01 and 100. If FIXED_AMOUNT, must be positive.',
    example: 20,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @ValidateIf((o) => o.discountType === DiscountType.PERCENTAGE)
  @Min(0.01)
  discountValue!: number;

  @ApiPropertyOptional({
    description:
      'Maximum discount cap amount (in currency units, e.g. ₹500) applicable for PERCENTAGE discounts.',
    example: 500,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    description:
      'Minimum order subtotal (in currency units, e.g. ₹1000) required to apply this coupon.',
    example: 1000,
    default: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minimumOrderAmount?: number;

  @ApiProperty({
    description: 'ISO-8601 timestamp when the coupon becomes valid and usable.',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startsAt!: string;

  @ApiProperty({
    description: 'ISO-8601 timestamp when the coupon expires.',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  expiresAt!: string;

  @ApiPropertyOptional({
    description:
      'Global maximum number of times this coupon can be used across all customers. Null indicates unlimited.',
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({
    description:
      'Maximum number of times an individual customer can use this coupon. Default is 1.',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  perUserUsageLimit?: number = 1;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active and ready to be redeemed.',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
