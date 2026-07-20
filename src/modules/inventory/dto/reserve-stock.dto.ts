import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({
    description: 'Stock quantity to reserve (must be >= 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
