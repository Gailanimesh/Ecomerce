import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'ProductVariant unique identifier (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  productVariantId!: string;

  @ApiProperty({
    description: 'Quantity of variant to add to cart',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
