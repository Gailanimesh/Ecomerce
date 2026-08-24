import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '../enums/discount-type.enum';

export class CouponQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed).',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page.',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Search string matching code or description (case-insensitive).',
    example: 'SAVE',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by coupon active status.',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by discount type.',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @ApiPropertyOptional({
    description: 'Sort field.',
    enum: ['code', 'discountValue', 'startsAt', 'expiresAt', 'usedCount', 'createdAt'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order direction.',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
