import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateThresholdDto {
  @ApiProperty({
    description: 'Low stock threshold value (must be >= 0)',
    example: 10,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  lowStockThreshold!: number;
}
