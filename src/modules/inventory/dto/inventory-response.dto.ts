import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta } from '../../catalog/dto/common/paginated-response.dto';

export class InventoryResponseDto {
  @ApiProperty({
    description: 'Inventory record unique identifier (UUID)',
    example: 'f7a8b9c0-d1e2-3456-7890-abcdef123456',
  })
  id!: string;

  @ApiProperty({
    description: 'Associated ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  productVariantId!: string;

  @ApiPropertyOptional({
    description: 'Associated ProductVariant SKU code',
    example: 'NIK-AM90-BLK-10',
  })
  sku?: string;

  @ApiProperty({
    description: 'Available stock quantity',
    example: 100,
  })
  availableQuantity!: number;

  @ApiProperty({
    description: 'Reserved stock quantity',
    example: 5,
  })
  reservedQuantity!: number;

  @ApiProperty({
    description: 'Low stock threshold trigger level',
    example: 5,
  })
  lowStockThreshold!: number;

  @ApiProperty({
    description: 'Derived availability status (availableQuantity > 0)',
    example: true,
  })
  isAvailable!: boolean;

  @ApiProperty({
    description: 'Derived low stock status (availableQuantity <= lowStockThreshold)',
    example: false,
  })
  isLowStock!: boolean;

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
}

export class PaginatedInventoryResponseDto {
  @ApiProperty({
    description: 'Array of inventory records',
    type: [InventoryResponseDto],
  })
  items!: InventoryResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata details',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;
}
