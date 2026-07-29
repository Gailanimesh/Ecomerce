import { Entity, Column, OneToOne, OneToMany, JoinColumn, RelationId, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';
import { CartStatus } from '../enums/cart-status.enum';

@Entity('carts')
@Index(['user', 'status'], { unique: true })
export class Cart extends BaseEntity {
  @Column({
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.ACTIVE,
  })
  status!: CartStatus;

  @Column({
    default: true,
  })
  isActive!: boolean;

  @OneToOne(() => User, (user) => user.cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @RelationId((cart: Cart) => cart.user)
  userId!: string;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true })
  cartItems!: CartItem[];
}
