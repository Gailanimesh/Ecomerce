import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'orderId',
  })
  order!: Order;

  @ManyToOne(() => ProductVariant, (productVariant) => productVariant.orderItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'productVariantId',
  })
  productVariant?: ProductVariant;

  @Column({ nullable: true })
  productVariantId?: string;

  @Column()
  productName!: string;

  @Column({ nullable: true })
  productSlug?: string;

  @Column({ nullable: true })
  variantName?: string;

  @Column({ type: 'json', nullable: true })
  variantAttributes?: Record<string, any>;

  @Index()
  @Column()
  sku!: string;

  @Column({ nullable: true })
  brandName?: string;

  @Column({ nullable: true })
  categoryName?: string;

  @Column({ nullable: true })
  thumbnail?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPrice!: string;

  @Column({
    type: 'integer',
    default: 1,
  })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  lineTotal!: string;

  get subtotal(): string {
    return this.lineTotal;
  }
}