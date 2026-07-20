import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({
    description: 'Brand unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'Nike',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly brand slug',
    example: 'nike',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Global leader in athletic footwear, apparel, and equipment.',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Brand logo image URL',
    example: 'https://cdn.example.com/brands/nike-logo.png',
  })
  logoUrl?: string;

  @ApiProperty({
    description: 'Whether the brand is active and displayed in catalog',
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
