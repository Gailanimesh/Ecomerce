import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @IsUUID()
  @IsNotEmpty()
  variantId!: string;

  @ApiProperty({
    description: 'Initial available stock quantity (must be >= 0)',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  availableQuantity!: number;

  @ApiPropertyOptional({
    description: 'Initial reserved quantity (default: 0, must be >= 0)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedQuantity?: number = 0;

  @ApiPropertyOptional({
    description: 'Low stock threshold trigger level (default: 5, must be >= 0)',
    example: 5,
    minimum: 0,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number = 5;
}
