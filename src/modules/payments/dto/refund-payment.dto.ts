import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description: 'Reason for refund',
    example: 'Customer requested cancellation prior to shipping.',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Partial refund amount (in Rupees). Omit for full refund.',
    example: 499.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
