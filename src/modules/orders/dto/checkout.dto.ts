import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethods } from '../../payments/enums/payment-method.enum';

export class CheckoutDto {
  @ApiProperty({
    description: 'UUID of the saved delivery address owned by the user.',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  addressId!: string;

  @ApiPropertyOptional({
    description: 'Selected payment method for order placement.',
    enum: PaymentMethods,
    example: PaymentMethods.CARD,
  })
  @IsEnum(PaymentMethods)
  @IsOptional()
  paymentMethod?: PaymentMethods;

  @ApiPropertyOptional({
    description: 'Optional customer instructions or notes for the delivery team.',
    example: 'Please leave the package with the apartment security desk.',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional coupon code (case-insensitive) to apply authoritative discount to this checkout.',
    example: 'SAVE20',
  })
  @IsString()
  @IsOptional()
  couponCode?: string;
}
