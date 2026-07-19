import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductMedia } from './product-media.entity';
import { ProductStatus } from '../enum/productstaus.enum';

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name!: string;
  @Index()
  @Column({
    unique: true,
  })
  slug!: string;

  @Column({
    nullable: true,
  })
  description?: string;
  @Column({nullable: true})
  shortDescription?: string ;
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({
    name: 'brandId',
  })
  brand!: Brand;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({
    name: 'categoryId',
  })
  category!: Category;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants!: ProductVariant[];

  @OneToMany(() => ProductMedia, (media) => media.product, {
    cascade: true,
  })
  media!: ProductMedia[];
}
