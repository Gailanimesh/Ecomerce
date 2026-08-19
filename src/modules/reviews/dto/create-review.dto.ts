import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Star rating from 1 (lowest) to 5 (highest)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt({ message: 'Rating must be an integer between 1 and 5' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional headline/title for the review',
    example: 'Exceptional build quality and comfort',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title must not exceed 150 characters' })
  title?: string;

  @ApiProperty({
    description: 'Detailed written feedback about the verified purchase',
    example:
      'I have been wearing these shoes for two weeks. The cushioning is excellent and the materials feel premium.',
    minLength: 10,
    maxLength: 3000,
  })
  @IsNotEmpty({ message: 'Review content cannot be empty' })
  @IsString()
  @MinLength(10, { message: 'Review content must be at least 10 characters long' })
  @MaxLength(3000, { message: 'Review content must not exceed 3000 characters' })
  content!: string;
}
