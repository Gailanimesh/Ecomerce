import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../enums/review-status.enum';
import { ReviewSortBy, SortOrder } from './review-query.dto';

export class AdminReviewQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of reviews per page',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Filter reviews by moderation status',
    enum: ReviewStatus,
    example: ReviewStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({
    description: 'Filter reviews by Product UUID',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter reviews by User UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter reviews by specific star rating (1 to 5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Field to sort reviews by',
    enum: ReviewSortBy,
    default: ReviewSortBy.CREATED_AT,
    example: ReviewSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ReviewSortBy)
  sortBy: ReviewSortBy = ReviewSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
