import { ApiProperty } from '@nestjs/swagger';

export class CartSummaryDto {
  @ApiProperty({
    description: 'Number of distinct cart item entries',
    example: 3,
  })
  totalItems!: number;

  @ApiProperty({
    description: 'Sum of all item quantities in the cart',
    example: 7,
  })
  totalQuantity!: number;

  @ApiProperty({
    description: 'Calculated subtotal based on item unit price snapshots',
    example: 340.0,
  })
  subtotal!: number;
}
