import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../../entities/product-media.entity';

export class ProductMediaResponseDto {
  @ApiProperty({
    description: 'Media item unique identifier (UUID)',
    example: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
  })
  id!: string;

  @ApiProperty({
    description: 'Media asset URL',
    example: 'https://cdn.example.com/products/nike-air-max-1.jpg',
  })
  url!: string;

  @ApiProperty({
    description: 'URL-friendly media asset slug',
    example: 'nike-air-max-1',
  })
  slug!: string;

  @ApiProperty({
    description: 'Media type (IMAGE or VIDEO)',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  type!: MediaType;

  @ApiPropertyOptional({
    description: 'Alternative text for accessibility and SEO',
    example: 'Nike Air Max 90 Black/Red side view',
  })
  altText?: string;

  @ApiProperty({
    description: 'Display order priority (0 for primary asset)',
    example: 0,
  })
  displayOrder!: number;

  @ApiProperty({
    description: 'Whether media asset is active',
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
