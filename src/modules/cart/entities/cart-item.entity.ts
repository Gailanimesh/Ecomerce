import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';
import { Unique } from 'typeorm';

@Unique(['cart', 'productVariant'])
@Entity('cart_items')
export class CartItem extends BaseEntity {
  @Column({
    type: 'int',
    default: 1,
    })
    quantity!: number;
  @ManyToOne(()=>ProductVariant,(productVariant)=>productVariant.cartItems)
  productVariant!: ProductVariant;

  @ManyToOne(() => Cart, (cart) => cart.cartItems, {
    onDelete: 'CASCADE',
  })
    @JoinColumn({
        name: 'cartId',
    })
  cart!: Cart;
}
