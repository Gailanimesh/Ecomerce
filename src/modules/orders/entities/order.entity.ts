import {  Entity, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

import { Payment } from '../../payments/entities/payment.entity';
@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
    })
    subtotal!: string;
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default:0
    })
    discount!: string;
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
    })
    tax!: string;
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default:0
    })
    shippingFee!: string;
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default:0
    })
    grandTotal!: string;

    @Column()
    shippingName!: string;

    @Column()
    shippingPhone!: string;

    @Column()
    shippingStreet!: string;

    @Column()
    shippingCity!: string;

    @Column()
    shippingState!: string;

    @Column()
    shippingCountry!: string;

    @Column()
    shippingPostalCode!: string;

    @Column({
    nullable:true,
})
    notes!: string;

    @CreateDateColumn({
        type: 'timestamp',
    })
    placedAt!: Date;

    


@ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'RESTRICT',
})
    @JoinColumn({
        name: 'userId',
    })
    user!: User;

@OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
        onDelete: 'CASCADE',
    })
    orderItems!: OrderItem[];
    @OneToOne(() => Payment, (payment) => payment.order, {
    })
    payment!: Payment;
}