import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Review } from '../entities/review.entity';
import { Product } from '../../catalog/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { ReviewStatus } from '../enums/review-status.enum';
import { RoleEnum } from '../../../common/enums/roles.enum';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ReviewQueryDto, ReviewSortBy, SortOrder } from '../dto/review-query.dto';
import { AdminReviewQueryDto } from '../dto/admin-review-query.dto';
import { ModerationReviewDto } from '../dto/moderation-review.dto';
import {
  ReviewResponseDto,
  ProductRatingSummaryDto,
  PaginatedReviewsResponseDto,
  AdminReviewResponseDto,
  PaginatedAdminReviewsResponseDto,
} from '../dto/review-response.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // Customer Review Operations
  // ==========================================

  async createReview(
    userId: string,
    productId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // 1. Verify Product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    // 2. Check for duplicate review (Single active review per user/product)
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId },
    });
    if (existingReview) {
      throw new ConflictException(
        'You have already reviewed this product. Please update your existing review instead.',
      );
    }

    // 3. Verify purchase eligibility (Order must be DELIVERED or COMPLETED)
    const qualifyingOrderItem = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'order')
      .innerJoin('orderItem.productVariant', 'variant')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status IN (:...eligibleStatuses)', {
        eligibleStatuses: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
      })
      .andWhere('variant.productId = :productId', { productId })
      .select(['orderItem.id'])
      .getOne();

    if (!qualifyingOrderItem) {
      throw new ForbiddenException(
        'Verified purchase required. You can only review products from orders that have been delivered or completed.',
      );
    }

    // 4. Create Review (Starts in PENDING state)
    const review = this.reviewRepository.create({
      userId,
      productId,
      orderItemId: qualifyingOrderItem.id,
      rating: dto.rating,
      title: dto.title?.trim() || null,
      content: dto.content.trim(),
      status: ReviewStatus.PENDING,
    });

    const savedReview = await this.reviewRepository.save(review);

    const fullReview = await this.reviewRepository.findOne({
      where: { id: savedReview.id },
      relations: { user: true },
    });

    this.logger.log(
      `User '${userId}' submitted review '${savedReview.id}' for product '${productId}' (status: PENDING).`,
    );

    return this.mapToReviewResponseDto(fullReview!);
  }

  async getMyReviews(
    userId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = ReviewSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.userId = :userId', { userId });

    if (rating) {
      qb.andWhere('review.rating = :rating', { rating });
    }

    qb.orderBy(`review.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [reviews, totalItems] = await qb.getManyAndCount();

    return {
      items: reviews.map((r) => this.mapToReviewResponseDto(r)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  async getReviewById(
    reviewId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    const isAdmin = currentUser?.role === RoleEnum.ADMIN;
    const isOwner = currentUser?.id === review.userId;
    const isApproved = review.status === ReviewStatus.APPROVED;

    // Visibility: Customer sees own, Admin sees any, Public sees only APPROVED
    if (!isAdmin && !isOwner && !isApproved) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    return this.mapToReviewResponseDto(review);
  }

  async updateReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You are not authorized to modify this review.');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.title !== undefined) {
      review.title = dto.title.trim() || null;
    }
    if (dto.content !== undefined) {
      review.content = dto.content.trim();
    }

    // Re-moderation lifecycle: Editing returns APPROVED or REJECTED review back to PENDING
    if (
      review.status === ReviewStatus.APPROVED ||
      review.status === ReviewStatus.REJECTED
    ) {
      review.status = ReviewStatus.PENDING;
      review.adminReason = null;
      review.moderatedByUserId = null;
      review.moderatedAt = null;
    }

    const updated = await this.reviewRepository.save(review);
    this.logger.log(
      `User '${userId}' updated review '${reviewId}' (status reset to PENDING).`,
    );

    return this.mapToReviewResponseDto(updated);
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this review.');
    }

    await this.reviewRepository.remove(review);
    this.logger.log(`User '${userId}' deleted review '${reviewId}'.`);
  }

  // ==========================================
  // Public Product Reviews
  // ==========================================

  async getProductReviews(
    productId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = ReviewSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :approvedStatus', {
        approvedStatus: ReviewStatus.APPROVED,
      });

    if (rating) {
      qb.andWhere('review.rating = :rating', { rating });
    }

    qb.orderBy(`review.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [reviews, totalItems] = await qb.getManyAndCount();
    const ratingSummary = await this.getProductRatingSummary(productId);

    return {
      items: reviews.map((r) => this.mapToReviewResponseDto(r)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
      ratingSummary,
    };
  }

  async getProductRatingSummary(
    productId: string,
  ): Promise<ProductRatingSummaryDto> {
    const rawResult = await this.reviewRepository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'count')
      .addSelect('AVG(review.rating)', 'avg')
      .addSelect('COUNT(CASE WHEN review.rating = 5 THEN 1 END)', 'star5')
      .addSelect('COUNT(CASE WHEN review.rating = 4 THEN 1 END)', 'star4')
      .addSelect('COUNT(CASE WHEN review.rating = 3 THEN 1 END)', 'star3')
      .addSelect('COUNT(CASE WHEN review.rating = 2 THEN 1 END)', 'star2')
      .addSelect('COUNT(CASE WHEN review.rating = 1 THEN 1 END)', 'star1')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :approvedStatus', {
        approvedStatus: ReviewStatus.APPROVED,
      })
      .getRawOne();

    const reviewCount = parseInt(rawResult?.count || '0', 10);
    const averageRating =
      reviewCount > 0 ? parseFloat(parseFloat(rawResult?.avg || '0').toFixed(1)) : 0;

    return {
      averageRating,
      reviewCount,
      ratingDistribution: {
        '5': parseInt(rawResult?.star5 || '0', 10),
        '4': parseInt(rawResult?.star4 || '0', 10),
        '3': parseInt(rawResult?.star3 || '0', 10),
        '2': parseInt(rawResult?.star2 || '0', 10),
        '1': parseInt(rawResult?.star1 || '0', 10),
      },
    };
  }

  // ==========================================
  // Admin Moderation Operations
  // ==========================================

  async getAdminReviews(
    query: AdminReviewQueryDto,
  ): Promise<PaginatedAdminReviewsResponseDto> {
    const {
      page = 1,
      limit = 10,
      status,
      productId,
      userId,
      rating,
      sortBy = ReviewSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user');

    if (status) {
      qb.andWhere('review.status = :status', { status });
    }
    if (productId) {
      qb.andWhere('review.productId = :productId', { productId });
    }
    if (userId) {
      qb.andWhere('review.userId = :userId', { userId });
    }
    if (rating) {
      qb.andWhere('review.rating = :rating', { rating });
    }

    qb.orderBy(`review.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [reviews, totalItems] = await qb.getManyAndCount();

    return {
      items: reviews.map((r) => this.mapToAdminReviewResponseDto(r)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  async getAdminReviewById(reviewId: string): Promise<AdminReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    return this.mapToAdminReviewResponseDto(review);
  }

  async moderateReview(
    reviewId: string,
    dto: ModerationReviewDto,
    adminUserId: string,
  ): Promise<AdminReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true, product: true },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    review.status = dto.status;
    review.adminReason = dto.reason?.trim() || null;
    review.moderatedByUserId = adminUserId;
    review.moderatedAt = new Date();

    const saved = await this.reviewRepository.save(review);

    // Send customer in-app notification & dispatch email post-moderation
    if (review.user && review.product) {
      if (dto.status === ReviewStatus.APPROVED) {
        await this.notificationsService.notifyReviewApproved(
          { id: saved.id, rating: saved.rating },
          { id: review.product.id, name: review.product.name },
          {
            id: review.user.id,
            email: review.user.email,
            fullName: review.user.fullName,
          },
        );
      } else if (dto.status === ReviewStatus.REJECTED) {
        await this.notificationsService.notifyReviewRejected(
          { id: saved.id },
          { id: review.product.id, name: review.product.name },
          {
            id: review.user.id,
            email: review.user.email,
            fullName: review.user.fullName,
          },
          dto.reason,
        );
      }
    }

    this.logger.log(
      `Admin '${adminUserId}' moderated review '${reviewId}' to '${dto.status}'.`,
    );

    return this.mapToAdminReviewResponseDto(saved);
  }

  async adminDeleteReview(reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${reviewId}' not found.`);
    }

    await this.reviewRepository.remove(review);
    this.logger.log(`Admin deleted review '${reviewId}'.`);
  }

  // ==========================================
  // Helper Mappers
  // ==========================================

  private mapToReviewResponseDto(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      isVerifiedPurchase: true,
      author: {
        id: review.user?.id ?? review.userId,
        fullName: review.user?.fullName ?? 'Verified Buyer',
      },
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private mapToAdminReviewResponseDto(review: Review): AdminReviewResponseDto {
    return {
      id: review.id,
      productId: review.productId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      adminReason: review.adminReason,
      moderatedByUserId: review.moderatedByUserId,
      moderatedAt: review.moderatedAt,
      user: {
        id: review.user?.id ?? review.userId,
        fullName: review.user?.fullName ?? 'Unknown User',
        email: review.user?.email ?? '',
      },
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
