import {
  Column,
  Entity,
  In,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from './role.entity';
import { Address } from './address.entity';
import { Session } from '../../auth/entities/session.entity';
import { Cart } from '../../cart/entities/cart.entity';

import { Order } from '../../orders/entities/order.entity';
@Entity('users')
export class User extends BaseEntity {
  @Column()
  fullName!: string;
  @Index()
  @Column({
    unique: true,
  })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({
    default: true,
  })
  isActive!: boolean;

  @ManyToOne(() => Role, (role) => role.users, {
    eager: true,
  })
  role!: Role;
  @OneToMany(() => Address, (address) => address.user, {
    cascade: true,
  })
  addresses!: Address[];
  @OneToMany(() => Session, (session) => session.user, {
  })
  sessions!: Session[];
@OneToOne(() => Cart, (cart) => cart.user,{

})
cart!: Cart;

@OneToMany(() => Order, (order) => order.user, {

})
orders!: Order[];

}
