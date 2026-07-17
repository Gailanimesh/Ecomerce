import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('inventory')
export class Inventory extends BaseEntity {
  @Column({
    default: 0,
  })
  quantity!: number;

  @Column({
    default: 0,
  })
  reservedQuantity!: number;

  @Column({
    default: 5,
  })
  lowStockThreshold!: number;

  @OneToOne(() => ProductVariant, (variant) => variant.inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'productVariantId',
  })
  variant!: ProductVariant;
}