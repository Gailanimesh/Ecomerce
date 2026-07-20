import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category unique identifier (UUID)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  id!: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Footwear',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly category slug',
    example: 'footwear',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Parent category UUID if this is a subcategory',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  parentId?: string;

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
