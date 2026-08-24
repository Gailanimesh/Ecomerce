import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Coupon } from '../entities/coupon.entity';
import { CouponUsage } from '../entities/coupon-usage.entity';
import { DiscountType } from '../enums/discount-type.enum';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';
import { CouponQueryDto } from '../dto/coupon-query.dto';
import {
  CouponResponseDto,
  PaginatedCouponsResponseDto,
  CouponUsageResponseDto,
  PaginatedCouponUsagesResponseDto,
} from '../dto/coupon-response.dto';
import { toPaise, toRupees } from '../../../common/utils/money.util';

export interface CalculatedDiscountResult {
  coupon: Coupon;
  discountNum: number;
  discountFormatted: string;
  subtotalFormatted: string;
  totalAfterDiscountFormatted: string;
  subtotalNum: number;
  totalAfterDiscountNum: number;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly couponUsageRepository: Repository<CouponUsage>,
  ) {}

  // =========================================================================
  // Admin CRUD & Lifecycle Operations
  // =========================================================================

  async createCoupon(dto: CreateCouponDto): Promise<CouponResponseDto> {
    const code = dto.code.trim().toUpperCase();

    // Check duplicate code
    const existing = await this.couponRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Coupon with code "${code}" already exists.`);
    }

    // Validate dates
    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= startsAt) {
      throw new BadRequestException('expiresAt must be after startsAt.');
    }

    const coupon = this.couponRepository.create({
      code,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue.toFixed(2),
      maxDiscountAmount: dto.maxDiscountAmount
        ? dto.maxDiscountAmount.toFixed(2)
        : null,
      minimumOrderAmount: dto.minimumOrderAmount
        ? dto.minimumOrderAmount.toFixed(2)
        : '0.00',
      startsAt,
      expiresAt,
      usageLimit: dto.usageLimit ?? null,
      perUserUsageLimit: dto.perUserUsageLimit ?? 1,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.couponRepository.save(coupon);
    return this.mapToCouponResponseDto(saved);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }

    if (dto.description !== undefined) {
      coupon.description = dto.description;
    }
    if (dto.maxDiscountAmount !== undefined) {
      coupon.maxDiscountAmount = dto.maxDiscountAmount
        ? dto.maxDiscountAmount.toFixed(2)
        : null;
    }
    if (dto.minimumOrderAmount !== undefined) {
      coupon.minimumOrderAmount = dto.minimumOrderAmount
        ? dto.minimumOrderAmount.toFixed(2)
        : '0.00';
    }
    if (dto.usageLimit !== undefined) {
      coupon.usageLimit = dto.usageLimit;
    }
    if (dto.perUserUsageLimit !== undefined) {
      coupon.perUserUsageLimit = dto.perUserUsageLimit;
    }
    if (dto.isActive !== undefined) {
      coupon.isActive = dto.isActive;
    }

    if (dto.startsAt || dto.expiresAt) {
      const startsAt = dto.startsAt ? new Date(dto.startsAt) : coupon.startsAt;
      const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : coupon.expiresAt;
      if (expiresAt <= startsAt) {
        throw new BadRequestException('expiresAt must be after startsAt.');
      }
      coupon.startsAt = startsAt;
      coupon.expiresAt = expiresAt;
    }

    const saved = await this.couponRepository.save(coupon);
    return this.mapToCouponResponseDto(saved);
  }

  async getCouponById(id: string): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }
    return this.mapToCouponResponseDto(coupon);
  }

  async getCouponByCode(code: string): Promise<CouponResponseDto> {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.couponRepository.findOne({ where: { code: normalized } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with code "${normalized}" not found.`);
    }
    return this.mapToCouponResponseDto(coupon);
  }

  async getAllCoupons(query: CouponQueryDto): Promise<PaginatedCouponsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.couponRepository.createQueryBuilder('coupon');

    if (query.search) {
      qb.andWhere(
        '(coupon.code ILIKE :search OR coupon.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.isActive !== undefined) {
      qb.andWhere('coupon.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.discountType) {
      qb.andWhere('coupon.discountType = :discountType', {
        discountType: query.discountType,
      });
    }

    const allowedSortFields = [
      'code',
      'discountValue',
      'startsAt',
      'expiresAt',
      'usedCount',
      'createdAt',
    ];
    const sortField = allowedSortFields.includes(query.sortBy)
      ? `coupon.${query.sortBy}`
      : 'coupon.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortField, sortOrder).skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((c) => this.mapToCouponResponseDto(c)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async activateCoupon(id: string): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }
    coupon.isActive = true;
    const saved = await this.couponRepository.save(coupon);
    return this.mapToCouponResponseDto(saved);
  }

  async deactivateCoupon(id: string): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }
    coupon.isActive = false;
    const saved = await this.couponRepository.save(coupon);
    return this.mapToCouponResponseDto(saved);
  }

  async deleteCoupon(id: string): Promise<void> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }

    const usagesCount = await this.couponUsageRepository.count({
      where: { couponId: id },
    });

    if (usagesCount > 0 || coupon.usedCount > 0) {
      throw new BadRequestException(
        'Cannot delete coupon that has historical usages recorded. Deactivate it instead.',
      );
    }

    await this.couponRepository.remove(coupon);
  }

  async getCouponUsageHistory(
    couponId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedCouponUsagesResponseDto> {
    await this.getCouponById(couponId); // Ensure coupon exists

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.couponUsageRepository.findAndCount({
      where: { couponId },
      order: { createdAt: 'DESC' },
      skip,
      take: safeLimit,
    });

    return {
      items: items.map((u) => ({
        id: u.id,
        couponId: u.couponId,
        userId: u.userId,
        orderId: u.orderId,
        discountAmount: Number(u.discountAmount),
        createdAt: u.createdAt,
      })),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // =========================================================================
  // Core Business Operations: Validation, Pricing Calculation & Consumption
  // =========================================================================

  /**
   * Authoritatively validates a coupon code against a customer's subtotal
   * and calculates the exact integer-accurate discount amount.
   *
   * Enforces:
   * 1. Coupon existence
   * 2. Active status
   * 3. Validity date window (startsAt <= now && expiresAt > now)
   * 4. Minimum order amount (subtotal >= minimumOrderAmount)
   * 5. Global usage limit (usedCount < usageLimit)
   * 6. Per-user usage limit (CouponUsage count for user < perUserUsageLimit)
   * 7. Clamping discount <= subtotal (grand total never negative)
   */
  async validateAndCalculateDiscount(
    userId: string,
    code: string,
    subtotalNum: number,
    manager?: EntityManager,
  ): Promise<CalculatedDiscountResult> {
    const couponRepo = manager
      ? manager.getRepository(Coupon)
      : this.couponRepository;
    const usageRepo = manager
      ? manager.getRepository(CouponUsage)
      : this.couponUsageRepository;

    const normalizedCode = code.trim().toUpperCase();

    const coupon = await couponRepo.findOne({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code "${normalizedCode}" not found.`);
    }

    if (!coupon.isActive) {
      throw new BadRequestException(
        `Coupon "${normalizedCode}" is currently inactive.`,
      );
    }

    const now = new Date();
    if (new Date(coupon.startsAt) > now) {
      throw new BadRequestException(
        `Coupon "${normalizedCode}" is not active yet (starts at ${coupon.startsAt.toISOString()}).`,
      );
    }

    if (new Date(coupon.expiresAt) <= now) {
      throw new BadRequestException(
        `Coupon "${normalizedCode}" expired on ${coupon.expiresAt.toISOString()}.`,
      );
    }

    const minOrderNum = Number(coupon.minimumOrderAmount);
    if (subtotalNum < minOrderNum) {
      throw new BadRequestException(
        `Order subtotal of ₹${subtotalNum.toFixed(
          2,
        )} does not meet the minimum requirement of ₹${minOrderNum.toFixed(
          2,
        )} for coupon "${normalizedCode}".`,
      );
    }

    // Check global usage limit
    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new BadRequestException(
        `Coupon "${normalizedCode}" has reached its maximum global usage limit.`,
      );
    }

    // Check per-user usage limit
    const userUsageCount = await usageRepo.count({
      where: { couponId: coupon.id, userId },
    });

    if (userUsageCount >= coupon.perUserUsageLimit) {
      throw new BadRequestException(
        `You have already reached the maximum usage limit (${coupon.perUserUsageLimit}) for coupon "${normalizedCode}".`,
      );
    }

    // Authoritative calculation via integer sub-units (paise)
    const subtotalPaise = toPaise(subtotalNum);
    let discountPaise = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      const percentage = Number(coupon.discountValue);
      discountPaise = Math.round(subtotalPaise * (percentage / 100));

      if (coupon.maxDiscountAmount) {
        const maxDiscountPaise = toPaise(coupon.maxDiscountAmount);
        discountPaise = Math.min(discountPaise, maxDiscountPaise);
      }
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discountPaise = toPaise(coupon.discountValue);
    }

    // Explicit clamp: discount <= subtotal
    discountPaise = Math.min(discountPaise, subtotalPaise);

    const discountFormatted = toRupees(discountPaise);
    const subtotalFormatted = toRupees(subtotalPaise);
    const totalAfterDiscountPaise = Math.max(0, subtotalPaise - discountPaise);
    const totalAfterDiscountFormatted = toRupees(totalAfterDiscountPaise);

    return {
      coupon,
      discountNum: parseFloat(discountFormatted),
      discountFormatted,
      subtotalFormatted,
      totalAfterDiscountFormatted,
      subtotalNum,
      totalAfterDiscountNum: parseFloat(totalAfterDiscountFormatted),
    };
  }

  /**
   * Atomically consumes coupon usage upon successful payment confirmation.
   * Participates in the payment confirmation database transaction.
   * Includes idempotency guard via UNIQUE constraint / check to protect against duplicate webhooks.
   */
  async consumeCoupon(
    userId: string,
    orderId: string,
    code: string,
    discountAmountStr: string,
    manager: EntityManager,
  ): Promise<void> {
    const couponRepo = manager.getRepository(Coupon);
    const usageRepo = manager.getRepository(CouponUsage);

    const normalizedCode = code.trim().toUpperCase();

    // Pessimistic write lock on coupon
    const coupon = await couponRepo.findOne({
      where: { code: normalizedCode },
      lock: { mode: 'pessimistic_write' },
    });

    if (!coupon) {
      return;
    }

    // Idempotency check: avoid double consumption on repeated payment webhooks
    const existingUsage = await usageRepo.findOne({
      where: { orderId, couponId: coupon.id },
    });

    if (existingUsage) {
      return;
    }

    // Increment usedCount
    coupon.usedCount += 1;
    await couponRepo.save(coupon);

    // Record CouponUsage
    const usage = usageRepo.create({
      couponId: coupon.id,
      userId,
      orderId,
      discountAmount: discountAmountStr,
    });
    await usageRepo.save(usage);
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private mapToCouponResponseDto(coupon: Coupon): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      maxDiscountAmount: coupon.maxDiscountAmount
        ? Number(coupon.maxDiscountAmount)
        : null,
      minimumOrderAmount: Number(coupon.minimumOrderAmount),
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      perUserUsageLimit: coupon.perUserUsageLimit,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}
