import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { ReviewsService } from '../services/reviews.service';
import { AdminReviewQueryDto } from '../dto/admin-review-query.dto';
import { ModerationReviewDto } from '../dto/moderation-review.dto';
import {
  AdminReviewResponseDto,
  PaginatedAdminReviewsResponseDto,
} from '../dto/review-response.dto';

import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RoleEnum } from '../../../common/enums/roles.enum';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@ApiTags('Admin - Reviews Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({
    summary: 'List customer reviews for moderation (Admin only)',
    description:
      'Retrieves paginated reviews across the platform with filtering by status (PENDING, APPROVED, REJECTED), product, user, or rating. Requires ADMIN role.',
  })
  @ApiOkResponse({
    type: PaginatedAdminReviewsResponseDto,
    description: 'Admin reviews list retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @Get()
  getAdminReviews(@Query() query: AdminReviewQueryDto) {
    return this.reviewsService.getAdminReviews(query);
  }

  @ApiOperation({
    summary: 'Get review details for moderation (Admin only)',
    description:
      'Retrieves complete review metadata including referenced OrderItem and user identity. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiOkResponse({
    type: AdminReviewResponseDto,
    description: 'Review moderation details retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found.',
  })
  @Get(':id')
  getAdminReviewById(@Param('id') id: string) {
    return this.reviewsService.getAdminReviewById(id);
  }

  @ApiOperation({
    summary: 'Moderate review (Approve or Reject) (Admin only)',
    description:
      'Approves or rejects a customer review. Records administrator audit trail (moderatedByUserId, moderatedAt) and optional administrative reason. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiOkResponse({
    type: AdminReviewResponseDto,
    description: 'Review moderated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found.',
  })
  @Patch(':id/moderation')
  moderateReview(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ModerationReviewDto,
  ) {
    return this.reviewsService.moderateReview(id, dto, admin.id);
  }

  @ApiOperation({
    summary: 'Delete review by admin (Admin only)',
    description: 'Permanently removes a review from the database. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review unique identifier (UUID)',
    example: 'f7a8b9c0-1234-5678-90ab-cdef12345678',
  })
  @ApiNoContentResponse({
    description: 'Review deleted successfully by administrator.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Review not found.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  adminDeleteReview(@Param('id') id: string) {
    return this.reviewsService.adminDeleteReview(id);
  }
}
