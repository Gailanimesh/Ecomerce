import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';
@Entity('carts')
export class Cart extends BaseEntity {
  @Column({
    default: true,
  })
  isActive!: boolean;

  @OneToOne(() => User, (user) => user.cart)
  @JoinColumn({
    name: 'userId',
  })
  user!: User;
  @OneToMany(() => CartItem, (cartItem) => cartItem.cart)
  cartItems!: CartItem[];

}

