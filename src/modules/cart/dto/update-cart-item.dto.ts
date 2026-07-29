import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Updated quantity for the cart item (setting to 0 removes item)',
    example: 3,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantity!: number;
}
