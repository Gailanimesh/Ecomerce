import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponseDto } from './cart-item-response.dto';
import { CartSummaryDto } from './cart-summary.dto';
import { CartValidationDto } from './cart-validation.dto';
import { CartStatus } from '../enums/cart-status.enum';

export class CartResponseDto {
  @ApiProperty({
    description: 'Cart unique identifier (UUID)',
    example: 'd1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Owner user unique identifier (UUID)',
    example: 'e1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  userId!: string;

  @ApiProperty({
    enum: CartStatus,
    description: 'Current status of the cart',
    example: CartStatus.ACTIVE,
  })
  status!: CartStatus;

  @ApiProperty({
    description: 'Enriched array of cart items',
    type: [CartItemResponseDto],
  })
  items!: CartItemResponseDto[];

  @ApiProperty({
    description: 'Computed cart summary totals',
    type: CartSummaryDto,
  })
  summary!: CartSummaryDto;

  @ApiProperty({
    description: 'Live validation details for the cart',
    type: CartValidationDto,
  })
  validation!: CartValidationDto;

  @ApiProperty({
    description: 'Cart creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Cart last update timestamp',
  })
  updatedAt!: Date;
}
