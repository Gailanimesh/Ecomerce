import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({
    unique: true,
  })
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

  @Column({
    nullable: true,
  })
  logoUrl?: string;

  @Column({
    default: true,
  })
  isActive!: boolean;

  @OneToMany(() => Product, (product) => product.brand)
  products!: Product[];
}