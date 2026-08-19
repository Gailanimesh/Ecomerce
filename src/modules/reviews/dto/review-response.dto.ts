import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '../enums/review-status.enum';
import { PaginationMeta } from '../../catalog/dto/common/paginated-response.dto';

export class ReviewAuthorDto {
  @ApiProperty({
    description: 'Unique identifier of the author',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Full name of the verified customer reviewer',
    example: 'John Doe',
  })
  fullName!: string;
}

export class ReviewResponseDto {
  @ApiProperty({
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  id!: string;

  @ApiProperty({
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  productId!: string;

  @ApiProperty({
    description: 'Star rating from 1 to 5',
    example: 5,
  })
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional headline/title for the review',
    example: 'Exceptional build quality and comfort',
  })
  title?: string | null;

  @ApiProperty({
    description: 'Review content body',
    example:
      'I have been wearing these shoes for two weeks. The cushioning is excellent and the materials feel premium.',
  })
  content!: string;

  @ApiProperty({
    description: 'Moderation status of the review',
    enum: ReviewStatus,
    example: ReviewStatus.APPROVED,
  })
  status!: ReviewStatus;

  @ApiProperty({
    description: 'Verified purchase flag',
    example: true,
  })
  isVerifiedPurchase: boolean = true;

  @ApiProperty({
    description: 'Author details of the reviewer',
    type: ReviewAuthorDto,
  })
  author!: ReviewAuthorDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-01T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-01T10:00:00.000Z',
  })
  updatedAt!: Date;
}

export class ProductRatingDistributionDto {
  @ApiProperty({ description: 'Number of 5-star reviews', example: 82 })
  5!: number;

  @ApiProperty({ description: 'Number of 4-star reviews', example: 31 })
  4!: number;

  @ApiProperty({ description: 'Number of 3-star reviews', example: 9 })
  3!: number;

  @ApiProperty({ description: 'Number of 2-star reviews', example: 3 })
  2!: number;

  @ApiProperty({ description: 'Number of 1-star reviews', example: 2 })
  1!: number;
}

export class ProductRatingSummaryDto {
  @ApiProperty({
    description: 'Average calculated rating of approved reviews (1.0 to 5.0)',
    example: 4.4,
  })
  averageRating!: number;

  @ApiProperty({
    description: 'Total count of approved reviews for this product',
    example: 127,
  })
  reviewCount!: number;

  @ApiProperty({
    description: 'Distribution of approved reviews by star count (1 through 5)',
    type: ProductRatingDistributionDto,
  })
  ratingDistribution!: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export class PaginatedReviewsResponseDto {
  @ApiProperty({
    description: 'List of approved product reviews',
    type: [ReviewResponseDto],
  })
  items!: ReviewResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;

  @ApiPropertyOptional({
    description: 'Summary rating breakdown for the product',
    type: ProductRatingSummaryDto,
  })
  ratingSummary?: ProductRatingSummaryDto;
}

export class AdminReviewUserDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  fullName!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email!: string;
}

export class AdminReviewResponseDto {
  @ApiProperty({
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  id!: string;

  @ApiProperty({
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  productId!: string;

  @ApiProperty({
    description: 'Referenced qualifying OrderItem UUID proving verified purchase',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  orderItemId!: string;

  @ApiProperty({
    description: 'Star rating from 1 to 5',
    example: 5,
  })
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional headline/title for the review',
    example: 'Exceptional build quality',
  })
  title?: string | null;

  @ApiProperty({
    description: 'Review content body',
    example: 'Detailed feedback from customer.',
  })
  content!: string;

  @ApiProperty({
    description: 'Moderation status of the review',
    enum: ReviewStatus,
    example: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @ApiPropertyOptional({
    description: 'Administrative reason recorded during moderation',
    example: 'Approved after verifying content appropriateness.',
  })
  adminReason?: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the administrator who moderated this review',
    example: '9a8b7c6d-5e4f-3a2b-1c0d-ef9876543210',
  })
  moderatedByUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when moderation occurred',
    example: '2026-02-01T11:00:00.000Z',
  })
  moderatedAt?: Date | null;

  @ApiProperty({
    description: 'Author details (sanitized user info required for moderation)',
    type: AdminReviewUserDto,
  })
  user!: AdminReviewUserDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-01T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-01T10:00:00.000Z',
  })
  updatedAt!: Date;
}

export class PaginatedAdminReviewsResponseDto {
  @ApiProperty({
    description: 'List of customer reviews for admin moderation',
    type: [AdminReviewResponseDto],
  })
  items!: AdminReviewResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;
}
