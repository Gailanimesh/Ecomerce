import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethods } from '../enums/payment-method.enum';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'Target Order ID (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional({
    description: 'Payment method override',
    enum: PaymentMethods,
    example: PaymentMethods.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethods)
  paymentMethod?: PaymentMethods;
}
