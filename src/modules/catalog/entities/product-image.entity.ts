import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { ProductVariant } from './product-variant.entity';

@Entity('product_images')
export class ProductImage extends BaseEntity {
  @Column()
  url!: string;
@Index()
@Column({ unique: true })
slug!: string;
  @Column({
    default: true,
  })
  isActive!: boolean;

  @ManyToOne(() => ProductVariant, (variant) => variant.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'productVariantId',
  })
  variant!: ProductVariant;
}