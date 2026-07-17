import {  Entity, Column, ManyToOne, OneToMany, JoinColumn, OneToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';


@Entity('order_items')  
export class OrderItem extends BaseEntity {
    @ManyToOne(() => Order, (order) => order.orderItems, {
        
    })
    @JoinColumn({
        name: 'orderId',
    })
    order!: Order;

    @ManyToOne(() => ProductVariant, (productVariant) => productVariant.orderItems, {
        
    })
    @JoinColumn({
        name: 'productVariantId',
    })
    productVariant!: ProductVariant;

    @Column({})
    productName!: string;
    @Column({ nullable: true })
    variantName!: string;

    @Index()
    @Column()
    sku!: string;
    @Column({
        type: 'decimal',
        precision: 10, 
        scale: 2,
    })
    unitPrice!: string

    @Column({
        type: 'integer',
        default: 1,

    })
    quantity!: number;

    @Column({
        type:'decimal',
        precision: 10,
        scale: 2,
})
    lineTotal!: string;

}