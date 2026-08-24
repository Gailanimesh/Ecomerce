import {
  Entity,
  Column,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { DiscountType } from '../enums/discount-type.enum';
import { CouponUsage } from './coupon-usage.entity';

@Entity('coupons')
@Unique('UQ_coupons_code', ['code'])
@Index('IDX_coupons_is_active', ['isActive'])
@Index('IDX_coupons_dates', ['startsAt', 'expiresAt'])
export class Coupon extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  discountType!: DiscountType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  discountValue!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDiscountAmount?: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minimumOrderAmount!: string;

  @Column({ type: 'timestamp' })
  startsAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'integer', nullable: true })
  usageLimit?: number | null;

  @Column({ type: 'integer', default: 0 })
  usedCount!: number;

  @Column({ type: 'integer', default: 1 })
  perUserUsageLimit!: number;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages!: CouponUsage[];
}
