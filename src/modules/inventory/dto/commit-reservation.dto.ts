import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CommitReservationDto {
  @ApiProperty({
    description: 'Reserved quantity to commit/fulfill (must be >= 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
