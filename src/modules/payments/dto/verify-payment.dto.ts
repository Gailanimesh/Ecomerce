import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Order ID (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    description: 'Razorpay Gateway Order ID',
    example: 'order_Nx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @ApiProperty({
    description: 'Razorpay Payment ID',
    example: 'pay_Nx9876543210',
  })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @ApiProperty({
    description: 'Razorpay Cryptographic Signature',
    example: 'e0d9a6064f2b96316279f50f4a8616142721869e595a92a549d479178f23023e',
  })
  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}
