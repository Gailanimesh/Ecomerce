import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariantResponseDto {
  @ApiProperty({
    description: 'Product variant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  id!: string;

  @ApiProperty({
    description: 'Stock Keeping Unit (SKU) code',
    example: 'NIK-AM90-BLK-10',
  })
  sku!: string;

  @ApiProperty({
    description: 'URL-friendly variant slug',
    example: 'nik-am90-blk-10',
  })
  slug!: string;

  @ApiProperty({
    description: 'Variant price formatted as decimal string',
    example: '149.99',
  })
  price!: string;

  @ApiPropertyOptional({
    description: 'Color attribute',
    example: 'Black/Red',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Size attribute',
    example: '10',
  })
  size?: string;

  @ApiProperty({
    description: 'Whether the variant is active for sale',
    example: true,
  })
  isActive!: boolean;

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
