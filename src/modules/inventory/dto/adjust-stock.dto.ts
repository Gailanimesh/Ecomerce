import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { AdjustmentType } from '../enums/adjustment-type.enum';

export class AdjustStockDto {
  @ApiProperty({
    description: 'Adjustment type (INCREASE or DECREASE)',
    enum: AdjustmentType,
    example: AdjustmentType.INCREASE,
  })
  @IsEnum(AdjustmentType)
  @IsNotEmpty()
  type!: AdjustmentType;

  @ApiProperty({
    description: 'Stock adjustment quantity (must be a positive integer >= 1)',
    example: 50,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
