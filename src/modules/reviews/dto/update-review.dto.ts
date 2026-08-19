import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Updated star rating from 1 to 5',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rating must be an integer between 1 and 5' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating?: number;

  @ApiPropertyOptional({
    description: 'Updated headline/title for the review',
    example: 'Great after breaking them in',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title must not exceed 150 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated review content (editing will return review to PENDING moderation status)',
    example:
      'Updated review: after one month of daily use, the sole holds up very well.',
    minLength: 10,
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Review content must be at least 10 characters long' })
  @MaxLength(3000, { message: 'Review content must not exceed 3000 characters' })
  content?: string;
}
