import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity('product_media')
export class ProductMedia extends BaseEntity {
  @Column()
  url!: string;

  @Index()
  @Column({ unique: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  type!: MediaType;

  @Column({
    nullable: true,
  })
  altText?: string;

  @Column({
    type: 'integer',
    default: 0,
  })
  displayOrder!: number;

  @Column({
    default: true,
  })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.media, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'productId',
  })
  product!: Product;
}
