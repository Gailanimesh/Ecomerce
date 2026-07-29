import { ApiProperty } from '@nestjs/swagger';

export class CartValidationDto {
  @ApiProperty({
    description: 'Flag indicating whether cart can proceed to checkout without issues',
    example: true,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'List of warning messages for unavailable stock, inactive products, or price changes',
    example: ['Only 2 items remain in stock.'],
    type: [String],
  })
  warnings!: string[];
}
