import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewStatus } from '../enums/review-status.enum';

export class ModerationReviewDto {
  @ApiProperty({
    description: 'Moderation decision (APPROVED or REJECTED)',
    enum: [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
    example: ReviewStatus.APPROVED,
  })
  @IsNotEmpty({ message: 'Moderation status is required' })
  @IsEnum([ReviewStatus.APPROVED, ReviewStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status!: ReviewStatus.APPROVED | ReviewStatus.REJECTED;

  @ApiPropertyOptional({
    description: 'Administrative feedback or reason for moderation decision (required when rejecting)',
    example: 'Review verified. Appropriate product feedback.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
