import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Cart item unique identifier (UUID)',
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Product unique identifier (UUID)',
    example: 'b1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  productId!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Nike Air Max',
  })
  productName!: string;

  @ApiProperty({
    description: 'Product slug',
    example: 'nike-air-max',
  })
  productSlug!: string;

  @ApiProperty({
    description: 'Product variant unique identifier (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  variantId!: string;

  @ApiProperty({
    description: 'Product variant SKU',
    example: 'NIKE-AIR-42-BLK',
  })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://example.com/images/nike-air-max.jpg',
    nullable: true,
  })
  thumbnailUrl?: string | null;

  @ApiProperty({
    description: 'Quantity of variant in cart',
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Price snapshot locked when added to cart',
    example: 120.0,
  })
  unitPriceSnapshot!: number;

  @ApiProperty({
    description: 'Current active catalog price for this variant',
    example: 120.0,
  })
  currentPrice!: number;

  @ApiProperty({
    description: 'Calculated subtotal (quantity * unitPriceSnapshot)',
    example: 240.0,
  })
  subtotal!: number;

  @ApiProperty({
    description: 'Available stock quantity in inventory',
    example: 15,
  })
  availableQuantity!: number;

  @ApiProperty({
    description: 'Whether the requested quantity is available in stock and product is active',
    example: true,
  })
  isAvailable!: boolean;

  @ApiProperty({
    description: 'Item-specific warnings (e.g. price change, stock shortage, inactive product)',
    type: [String],
    example: [],
  })
  warnings!: string[];

  @ApiProperty({
    description: 'Item creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Item last update timestamp',
  })
  updatedAt!: Date;
}
