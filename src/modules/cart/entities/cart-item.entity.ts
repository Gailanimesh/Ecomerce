import { Entity, Column, ManyToOne, JoinColumn, RelationId, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Unique(['cart', 'productVariant'])
@Entity('cart_items')
export class CartItem extends BaseEntity {
  @Column({
    type: 'int',
    default: 1,
  })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPriceSnapshot!: string;

  @ManyToOne(() => ProductVariant, (productVariant) => productVariant.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'productVariantId',
  })
  productVariant!: ProductVariant;

  @RelationId((cartItem: CartItem) => cartItem.productVariant)
  productVariantId!: string;

  @ManyToOne(() => Cart, (cart) => cart.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'cartId',
  })
  cart!: Cart;

  @RelationId((cartItem: CartItem) => cartItem.cart)
  cartId!: string;
}
