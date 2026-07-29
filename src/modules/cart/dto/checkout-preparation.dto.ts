import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponseDto } from './cart-item-response.dto';
import { CartSummaryDto } from './cart-summary.dto';
import { CartValidationDto } from './cart-validation.dto';

export class CheckoutPreparationDto {
  @ApiProperty({
    description: 'Flag indicating whether cart meets all conditions to proceed with checkout',
    example: true,
  })
  checkoutAllowed!: boolean;

  @ApiProperty({
    description: 'Cart summary details',
    type: CartSummaryDto,
  })
  cartSummary!: CartSummaryDto;

  @ApiProperty({
    description: 'Validation breakdown and warnings',
    type: CartValidationDto,
  })
  validation!: CartValidationDto;

  @ApiProperty({
    description: 'Enriched items ready for checkout processing',
    type: [CartItemResponseDto],
  })
  items!: CartItemResponseDto[];
}
