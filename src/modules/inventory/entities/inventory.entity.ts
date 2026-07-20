import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('inventory')
export class Inventory extends BaseEntity {
  @Column({
    name: 'quantity',
    type: 'integer',
    default: 0,
  })
  availableQuantity!: number;

  @Column({
    type: 'integer',
    default: 0,
  })
  reservedQuantity!: number;

  @Column({
    type: 'integer',
    default: 5,
  })
  lowStockThreshold!: number;

  @OneToOne(() => ProductVariant, (variant) => variant.inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productVariantId' })
  variant!: ProductVariant;

  @RelationId((inventory: Inventory) => inventory.variant)
  productVariantId!: string;

  get isAvailable(): boolean {
    return this.availableQuantity > 0;
  }

  get isLowStock(): boolean {
    return this.availableQuantity <= this.lowStockThreshold;
  }
}