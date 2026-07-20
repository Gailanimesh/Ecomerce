import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../enum/productstaus.enum';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { ProductVariantResponseDto } from '../variant/product-variant-response.dto';
import { ProductMediaResponseDto } from '../media/product-media-response.dto';
import { PaginationMeta } from '../common/paginated-response.dto';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  id!: string;

  @ApiProperty({
    description: 'Product title / name',
    example: 'Nike Air Max 90',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly product slug',
    example: 'nike-air-max-90',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the product',
    example: 'The Nike Air Max 90 stays true to its OG running roots with iconic Waffle outsole.',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Short summary description',
    example: 'Classic footwear with maximum cushioning.',
  })
  shortDescription?: string;

  @ApiProperty({
    description: 'Product publishing status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-15T08:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-15T08:30:00.000Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Associated Brand details',
    type: BrandResponseDto,
  })
  brand?: BrandResponseDto;

  @ApiPropertyOptional({
    description: 'Associated Category details',
    type: CategoryResponseDto,
  })
  category?: CategoryResponseDto;

  @ApiPropertyOptional({
    description: 'List of product variants',
    type: [ProductVariantResponseDto],
  })
  variants?: ProductVariantResponseDto[];

  @ApiPropertyOptional({
    description: 'List of associated media assets',
    type: [ProductMediaResponseDto],
  })
  media?: ProductMediaResponseDto[];
}

export class PaginatedProductResponseDto {
  @ApiProperty({
    description: 'Array of product items',
    type: [ProductResponseDto],
  })
  items!: ProductResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;
}
