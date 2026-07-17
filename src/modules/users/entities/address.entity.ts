import {
  Column,
  Entity,
  ManyToOne,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('addresses')
export class Address extends BaseEntity {
  @Column()
  street1!: string;

  @Column({
    nullable: true,
  })
  street2?: string;

  @Column()
  city!: string;

  @Column()
  state!: string;

  @Column()
  country!: string;

  @Column()
  postalCode!: string;

  @Column({
    default: false,
  })
  isDefault!: boolean;

  @ManyToOne(() => User, (user) => user.addresses, {
    onDelete: 'CASCADE',
  })
  user!: User;
}