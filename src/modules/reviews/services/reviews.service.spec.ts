import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { Review } from '../entities/review.entity';
import { Product } from '../../catalog/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { ReviewStatus } from '../enums/review-status.enum';
import { RoleEnum } from '../../../common/enums/roles.enum';
import { ReviewSortBy, SortOrder } from '../dto/review-query.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepository: jest.Mocked<Repository<Review>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;

  const mockProduct = {
    id: 'prod-uuid-1',
    name: 'Test Running Shoes',
    slug: 'test-running-shoes',
  } as Product;

  const mockUser = {
    id: 'user-uuid-1',
    fullName: 'John Doe',
    email: 'john@example.com',
  };

  const mockReview = {
    id: 'review-uuid-1',
    userId: 'user-uuid-1',
    productId: 'prod-uuid-1',
    orderItemId: 'item-uuid-1',
    rating: 5,
    title: 'Great Shoes',
    content: 'Very comfortable and fits true to size.',
    status: ReviewStatus.PENDING,
    adminReason: null,
    moderatedByUserId: null,
    moderatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  } as unknown as Review;

  beforeEach(async () => {
    const mockReviewRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProductRepo = {
      findOne: jest.fn(),
    };

    const mockOrderItemRepo = {
      createQueryBuilder: jest.fn(),
    };

    const mockNotificationsService = {
      notifyReviewApproved: jest.fn().mockResolvedValue(undefined),
      notifyReviewRejected: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepo,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewRepository = module.get(getRepositoryToken(Review));
    productRepository = module.get(getRepositoryToken(Product));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
  });

  describe('createReview', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createReview('user-uuid-1', 'non-existent', {
          rating: 5,
          content: 'Excellent product quality',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already reviewed this product', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      reviewRepository.findOne.mockResolvedValue(mockReview);

      await expect(
        service.createReview('user-uuid-1', 'prod-uuid-1', {
          rating: 5,
          content: 'Excellent product quality',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if user has no verified delivered/completed purchase', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      reviewRepository.findOne.mockResolvedValue(null);

      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      orderItemRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.createReview('user-uuid-1', 'prod-uuid-1', {
          rating: 5,
          content: 'Excellent product quality',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully create a review with status PENDING for verified purchaser', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      // 1st call for existing check -> null, 2nd call after save to fetch with relations -> mockReview
      reviewRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReview);

      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'item-uuid-1' }),
      };
      orderItemRepository.createQueryBuilder.mockReturnValue(qb);

      reviewRepository.create.mockReturnValue(mockReview);
      reviewRepository.save.mockResolvedValue(mockReview);

      const result = await service.createReview('user-uuid-1', 'prod-uuid-1', {
        rating: 5,
        title: 'Great Shoes',
        content: 'Very comfortable and fits true to size.',
      });

      expect(result.id).toBe('review-uuid-1');
      expect(result.status).toBe(ReviewStatus.PENDING);
      expect(result.isVerifiedPurchase).toBe(true);
      expect(result.author.fullName).toBe('John Doe');
      expect(reviewRepository.save).toHaveBeenCalled();
    });
  });

  describe('getReviewById visibility rules', () => {
    it('should allow author to see their own review even if PENDING', async () => {
      reviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.PENDING,
      });

      const result = await service.getReviewById('review-uuid-1', {
        id: 'user-uuid-1',
        role: RoleEnum.CUSTOMER,
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        sessionId: 'sess-1',
      });

      expect(result.id).toBe('review-uuid-1');
    });

    it('should allow admin to see any review regardless of status', async () => {
      reviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.REJECTED,
      });

      const result = await service.getReviewById('review-uuid-1', {
        id: 'admin-uuid-1',
        role: RoleEnum.ADMIN,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        sessionId: 'sess-2',
      });

      expect(result.id).toBe('review-uuid-1');
    });

    it('should allow public user to see APPROVED review', async () => {
      reviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.APPROVED,
      });

      const result = await service.getReviewById('review-uuid-1');
      expect(result.id).toBe('review-uuid-1');
    });

    it('should throw NotFoundException for public or other customer if review is PENDING or REJECTED', async () => {
      reviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.PENDING,
      });

      await expect(
        service.getReviewById('review-uuid-1', {
          id: 'other-user-uuid',
          role: RoleEnum.CUSTOMER,
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          sessionId: 'sess-3',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateReview', () => {
    it('should throw ForbiddenException if user is not author', async () => {
      reviewRepository.findOne.mockResolvedValue(mockReview);

      await expect(
        service.updateReview('different-user-id', 'review-uuid-1', {
          content: 'Attempting to change someone elses review',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reset status to PENDING when editing APPROVED review', async () => {
      const approvedReview = {
        ...mockReview,
        status: ReviewStatus.APPROVED,
        adminReason: 'Previously approved',
        moderatedByUserId: 'admin-1',
        moderatedAt: new Date(),
      };
      reviewRepository.findOne.mockResolvedValue(approvedReview);
      reviewRepository.save.mockImplementation(async (entity) => entity as any);

      const result = await service.updateReview('user-uuid-1', 'review-uuid-1', {
        rating: 4,
        content: 'Updated content after one month of use',
      });

      expect(result.rating).toBe(4);
      expect(result.status).toBe(ReviewStatus.PENDING);
      expect(approvedReview.adminReason).toBeNull();
      expect(approvedReview.moderatedByUserId).toBeNull();
    });

    it('should allow editing a REJECTED review and reset to PENDING for re-moderation', async () => {
      const rejectedReview = {
        ...mockReview,
        status: ReviewStatus.REJECTED,
        adminReason: 'Inappropriate language',
        moderatedByUserId: 'admin-1',
      };
      reviewRepository.findOne.mockResolvedValue(rejectedReview);
      reviewRepository.save.mockImplementation(async (entity) => entity as any);

      const result = await service.updateReview('user-uuid-1', 'review-uuid-1', {
        content: 'Revised content without any inappropriate language.',
      });

      expect(result.status).toBe(ReviewStatus.PENDING);
      expect(rejectedReview.adminReason).toBeNull();
    });
  });

  describe('deleteReview', () => {
    it('should throw ForbiddenException if customer is not owner', async () => {
      reviewRepository.findOne.mockResolvedValue(mockReview);

      await expect(
        service.deleteReview('different-user-id', 'review-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully delete review when customer owns it', async () => {
      reviewRepository.findOne.mockResolvedValue(mockReview);
      reviewRepository.remove.mockResolvedValue(mockReview);

      await expect(
        service.deleteReview('user-uuid-1', 'review-uuid-1'),
      ).resolves.not.toThrow();
      expect(reviewRepository.remove).toHaveBeenCalledWith(mockReview);
    });
  });

  describe('getProductRatingSummary (SQL Aggregation)', () => {
    it('should correctly calculate average and star distribution', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          count: '10',
          avg: '4.4000',
          star5: '6',
          star4: '2',
          star3: '2',
          star2: '0',
          star1: '0',
        }),
      };
      reviewRepository.createQueryBuilder.mockReturnValue(qb);

      const summary = await service.getProductRatingSummary('prod-uuid-1');

      expect(summary.reviewCount).toBe(10);
      expect(summary.averageRating).toBe(4.4);
      expect(summary.ratingDistribution['5']).toBe(6);
      expect(summary.ratingDistribution['4']).toBe(2);
      expect(summary.ratingDistribution['3']).toBe(2);
      expect(summary.ratingDistribution['2']).toBe(0);
      expect(summary.ratingDistribution['1']).toBe(0);
    });

    it('should return 0 rating and 0 count if no approved reviews exist', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          count: '0',
          avg: null,
          star5: '0',
          star4: '0',
          star3: '0',
          star2: '0',
          star1: '0',
        }),
      };
      reviewRepository.createQueryBuilder.mockReturnValue(qb);

      const summary = await service.getProductRatingSummary('prod-uuid-1');

      expect(summary.reviewCount).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.ratingDistribution['5']).toBe(0);
    });
  });

  describe('moderateReview (Admin Moderation & Audit)', () => {
    it('should approve review and record admin audit trail', async () => {
      reviewRepository.findOne.mockResolvedValue(mockReview);
      reviewRepository.save.mockImplementation(async (entity) => entity as any);

      const result = await service.moderateReview(
        'review-uuid-1',
        { status: ReviewStatus.APPROVED, reason: 'Verified genuine feedback' },
        'admin-uuid-123',
      );

      expect(result.status).toBe(ReviewStatus.APPROVED);
      expect(result.adminReason).toBe('Verified genuine feedback');
      expect(result.moderatedByUserId).toBe('admin-uuid-123');
      expect(result.moderatedAt).toBeInstanceOf(Date);
      expect(result.user.email).toBe('john@example.com');
    });

    it('should reject review and store rejection reason', async () => {
      reviewRepository.findOne.mockResolvedValue(mockReview);
      reviewRepository.save.mockImplementation(async (entity) => entity as any);

      const result = await service.moderateReview(
        'review-uuid-1',
        { status: ReviewStatus.REJECTED, reason: 'Contains spam link' },
        'admin-uuid-123',
      );

      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(result.adminReason).toBe('Contains spam link');
      expect(result.moderatedByUserId).toBe('admin-uuid-123');
    });
  });
});
