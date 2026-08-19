import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../catalog/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { ReviewStatus } from '../enums/review-status.enum';

@Entity('reviews')
@Unique('UQ_reviews_user_product', ['userId', 'productId'])
@Index('IDX_reviews_product_status', ['productId', 'status'])
@Index('IDX_reviews_status', ['status'])
@Index('IDX_reviews_created_at', ['createdAt'])
export class Review extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column()
  orderItemId!: string;

  @ManyToOne(() => OrderItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderItemId' })
  orderItem!: OrderItem;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @Column({ type: 'text', nullable: true })
  adminReason?: string | null;

  @Column({ type: 'uuid', nullable: true })
  moderatedByUserId?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt?: Date | null;
}
