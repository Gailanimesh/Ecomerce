import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @ApiPropertyOptional({
    description: 'Updated available stock quantity (must be >= 0)',
    example: 120,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({
    description: 'Updated reserved stock quantity (must be >= 0)',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedQuantity?: number;

  @ApiPropertyOptional({
    description: 'Updated low stock threshold (must be >= 0)',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
