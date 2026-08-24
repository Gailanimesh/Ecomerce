import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Coupon } from './coupon.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('coupon_usages')
@Unique('UQ_coupon_usages_order_coupon', ['orderId', 'couponId'])
@Index('IDX_coupon_usages_coupon_user', ['couponId', 'userId'])
@Index('IDX_coupon_usages_order', ['orderId'])
export class CouponUsage extends BaseEntity {
  @Column()
  couponId!: string;

  @ManyToOne(() => Coupon, (coupon) => coupon.usages, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'couponId' })
  coupon!: Coupon;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  discountAmount!: string;
}
