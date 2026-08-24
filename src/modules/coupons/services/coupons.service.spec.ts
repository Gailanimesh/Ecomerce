import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { CouponsService } from './coupons.service';
import { Coupon } from '../entities/coupon.entity';
import { CouponUsage } from '../entities/coupon-usage.entity';
import { DiscountType } from '../enums/discount-type.enum';

describe('CouponsService', () => {
  let service: CouponsService;
  let couponRepository: jest.Mocked<Repository<Coupon>>;
  let couponUsageRepository: jest.Mocked<Repository<CouponUsage>>;

  const mockCoupon: Coupon = {
    id: 'coupon-uuid-1',
    code: 'SAVE20',
    description: '20% off',
    discountType: DiscountType.PERCENTAGE,
    discountValue: '20.00',
    maxDiscountAmount: '100.00',
    minimumOrderAmount: '500.00',
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
    usageLimit: 100,
    usedCount: 5,
    perUserUsageLimit: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usages: [],
  };

  beforeEach(async () => {
    const mockCouponRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'new-uuid' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockUsageRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'usage-uuid' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: mockCouponRepo,
        },
        {
          provide: getRepositoryToken(CouponUsage),
          useValue: mockUsageRepo,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    couponRepository = module.get(getRepositoryToken(Coupon));
    couponUsageRepository = module.get(getRepositoryToken(CouponUsage));
  });

  describe('createCoupon', () => {
    it('should normalize coupon code to uppercase and save successfully', async () => {
      couponRepository.findOne.mockResolvedValue(null);

      const result = await service.createCoupon({
        code: '  save20  ',
        description: '20% off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        startsAt: new Date(Date.now() - 10000).toISOString(),
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
      });

      expect(result.code).toBe('SAVE20');
      expect(couponRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if coupon code already exists', async () => {
      couponRepository.findOne.mockResolvedValue(mockCoupon);

      await expect(
        service.createCoupon({
          code: 'SAVE20',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          startsAt: new Date(Date.now() - 10000).toISOString(),
          expiresAt: new Date(Date.now() + 1000000).toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if expiresAt is before or equal to startsAt', async () => {
      couponRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createCoupon({
          code: 'INVALID_DATES',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          startsAt: '2026-08-10T00:00:00.000Z',
          expiresAt: '2026-08-09T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateAndCalculateDiscount', () => {
    it('should correctly calculate percentage discount capped at maxDiscountAmount', async () => {
      couponRepository.findOne.mockResolvedValue(mockCoupon);
      couponUsageRepository.count.mockResolvedValue(0);

      // Subtotal ₹2,000; 20% would be ₹400; cap is ₹100
      const result = await service.validateAndCalculateDiscount(
        'user-1',
        'save20',
        2000,
      );

      expect(result.coupon.code).toBe('SAVE20');
      expect(result.discountNum).toBe(100);
      expect(result.discountFormatted).toBe('100.00');
      expect(result.totalAfterDiscountNum).toBe(1900);
    });

    it('should correctly calculate uncapped percentage discount', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        maxDiscountAmount: null,
      });
      couponUsageRepository.count.mockResolvedValue(0);

      // Subtotal ₹1,000; 20% = ₹200
      const result = await service.validateAndCalculateDiscount(
        'user-1',
        'SAVE20',
        1000,
      );

      expect(result.discountNum).toBe(200);
      expect(result.totalAfterDiscountNum).toBe(800);
    });

    it('should correctly calculate fixed amount discount and clamp to subtotal', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: '500.00',
        minimumOrderAmount: '0.00',
      });
      couponUsageRepository.count.mockResolvedValue(0);

      // Subtotal ₹300, fixed discount ₹500 -> discount clamped to ₹300, totalAfterDiscount = 0
      const result = await service.validateAndCalculateDiscount(
        'user-1',
        'SAVE500',
        300,
      );

      expect(result.discountNum).toBe(300);
      expect(result.totalAfterDiscountNum).toBe(0);
    });

    it('should throw NotFoundException if coupon code does not exist', async () => {
      couponRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateAndCalculateDiscount('user-1', 'NON_EXISTENT', 1000),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if coupon is inactive', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      });

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon has expired', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        expiresAt: new Date(Date.now() - 10000), // Expired
      });

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon has not started yet', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        startsAt: new Date(Date.now() + 100000), // Future
      });

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if subtotal is below minimumOrderAmount', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        minimumOrderAmount: '1000.00',
      });

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 400),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if global usageLimit is reached', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        usageLimit: 10,
        usedCount: 10,
      });

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if perUserUsageLimit is reached', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        perUserUsageLimit: 1,
      });
      couponUsageRepository.count.mockResolvedValue(1); // Already used once

      await expect(
        service.validateAndCalculateDiscount('user-1', 'SAVE20', 1000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('consumeCoupon (Payment Integration & Idempotency)', () => {
    it('should atomically increment usedCount and create CouponUsage on payment confirmation', async () => {
      const couponRepoInTx = {
        findOne: jest.fn().mockResolvedValue({ ...mockCoupon, usedCount: 5 }),
        save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      };
      const usageRepoInTx = {
        findOne: jest.fn().mockResolvedValue(null), // Not used yet for this order
        create: jest.fn().mockImplementation((d) => d),
        save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Coupon) return couponRepoInTx;
          if (entity === CouponUsage) return usageRepoInTx;
        }),
      } as unknown as EntityManager;

      await service.consumeCoupon(
        'user-1',
        'order-1',
        'SAVE20',
        '100.00',
        mockManager,
      );

      expect(couponRepoInTx.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedCount: 6 }),
      );
      expect(usageRepoInTx.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          orderId: 'order-1',
          discountAmount: '100.00',
        }),
      );
    });

    it('should be idempotent and not consume coupon twice for the same order', async () => {
      const couponRepoInTx = {
        findOne: jest.fn().mockResolvedValue({ ...mockCoupon, usedCount: 5 }),
        save: jest.fn(),
      };
      const usageRepoInTx = {
        findOne: jest.fn().mockResolvedValue({ id: 'existing-usage' }),
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Coupon) return couponRepoInTx;
          if (entity === CouponUsage) return usageRepoInTx;
        }),
      } as unknown as EntityManager;

      await service.consumeCoupon(
        'user-1',
        'order-1',
        'SAVE20',
        '100.00',
        mockManager,
      );

      expect(couponRepoInTx.save).not.toHaveBeenCalled();
      expect(usageRepoInTx.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteCoupon', () => {
    it('should throw BadRequestException if coupon has been used in orders', async () => {
      couponRepository.findOne.mockResolvedValue(mockCoupon);
      couponUsageRepository.count.mockResolvedValue(1);

      await expect(service.deleteCoupon('coupon-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete coupon if unused', async () => {
      couponRepository.findOne.mockResolvedValue({
        ...mockCoupon,
        usedCount: 0,
      });
      couponUsageRepository.count.mockResolvedValue(0);

      await service.deleteCoupon('coupon-uuid-1');
      expect(couponRepository.remove).toHaveBeenCalled();
    });
  });
});
