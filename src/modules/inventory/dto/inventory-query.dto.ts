import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InventoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by variant SKU (text search)',
    example: 'NIK-AM90-BLK-10',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Filter items where availableQuantity <= lowStockThreshold',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({
    description: 'Filter items where availableQuantity === 0',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  outOfStock?: boolean;

  @ApiPropertyOptional({
    description: 'Sort ordering field (sku, -sku, availableQuantity, -availableQuantity, updatedAt, -updatedAt)',
    example: 'availableQuantity',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
