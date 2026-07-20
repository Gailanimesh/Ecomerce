import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../enum/productstaus.enum';

export class GetProductsQueryDto {
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
    description: 'Number of products per page',
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
    description: 'Filter by category slug',
    example: 'footwear',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand slug',
    example: 'nike',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filter by product status (Admins only. Non-admin requests only return ACTIVE products).',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Filter products with minimum variant price',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter products with maximum variant price',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Search text query (matches name, description, brand, category, or SKU)',
    example: 'Nike Air',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Sort ordering field. Prefix with - for descending order (e.g. price, -price, createdAt, -createdAt).',
    example: '-price',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
