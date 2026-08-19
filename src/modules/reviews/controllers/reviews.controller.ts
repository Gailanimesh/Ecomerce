import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ReviewQueryDto } from '../dto/review-query.dto';
import {
  ReviewResponseDto,
  PaginatedReviewsResponseDto,
} from '../dto/review-response.dto';

import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@ApiTags('Reviews - Customer & Catalog')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ==========================================
  // Product Reviews (Catalog Scope)
  // ==========================================

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a product review (Verified purchase required)',
    description:
      'Creates a new customer review for a product. Requires authenticated customer with a DELIVERED or COMPLETED order containing this product. Initial state is PENDING until admin moderation.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiCreatedResponse({
    type: ReviewResponseDto,
    description: 'Review submitted successfully and is pending admin moderation.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body (invalid rating or content length).',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description:
      'Verified purchase required. Customer has not completed/received an order containing this product.',
  })
  @ApiNotFoundResponse({
    description: 'Product with specified ID not found.',
  })
  @ApiConflictResponse({
    description:
      'Customer has already reviewed this product. Update existing review instead.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('catalog/products/:productId/reviews')
  createReview(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, productId, dto);
  }

  @Public()
  @ApiOperation({
    summary: 'Get public product reviews and rating summary',
    description:
      'Retrieves paginated list of approved customer reviews and overall rating metrics (average rating, review count, star distribution). Publicly accessible.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiOkResponse({
    type: PaginatedReviewsResponseDto,
    description: 'Approved reviews and rating summary retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Product with specified ID not found.',
  })
  @Get('catalog/products/:productId/reviews')
  getProductReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getProductReviews(productId, query);
  }

  // ==========================================
  // Customer Review Management (Reviews Scope)
  // ==========================================

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated customer reviews',
    description:
      'Retrieves all reviews submitted by the currently logged in customer across all moderation states (PENDING, APPROVED, REJECTED).',
  })
  @ApiOkResponse({
    type: PaginatedReviewsResponseDto,
    description: 'Customer reviews retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('reviews/me')
  getMyReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getMyReviews(user.id, query);
  }

  @Public()
  @ApiOperation({
    summary: 'Get review by ID',
    description:
      'Retrieves a single review by UUID. Public callers can only view APPROVED reviews. Author and Admins can view regardless of moderation state.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiOkResponse({
    type: ReviewResponseDto,
    description: 'Review details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found or not published.',
  })
  @Get('reviews/:id')
  getReviewById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.reviewsService.getReviewById(id, user);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update own review',
    description:
      'Updates customer review content or rating. If the review was previously APPROVED or REJECTED, it automatically returns to PENDING status for re-moderation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiOkResponse({
    type: ReviewResponseDto,
    description: 'Review updated successfully and queued for re-moderation.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Customer is not the author of this review.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found.',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('reviews/:id')
  updateReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(user.id, id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete own review',
    description: 'Permanently deletes a review authored by the current customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiNoContentResponse({
    description: 'Review deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Customer is not the author of this review.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found.',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.deleteReview(user.id, id);
  }
}
