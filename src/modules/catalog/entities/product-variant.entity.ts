import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { Product } from './product.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

@Entity('product_variants')
export class ProductVariant extends BaseEntity {
  @Index()
  @Column({ unique: true })
  sku!: string;

  @Index()
  @Column({ unique: true })
  slug!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price!: string;

  @Column({
    nullable: true,
  })
  color?: string;

  @Column({
    nullable: true,
  })
  size?: string;

  @Column({
    default: true,
  })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({
    name: 'productId',
  })
  product!: Product;

  @OneToOne(() => Inventory, (inventory) => inventory.variant)
  inventory!: Inventory;

  @OneToMany(() => CartItem, (cartItem) => cartItem.productVariant)
  cartItems!: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.productVariant)
  orderItems!: OrderItem[];
}
