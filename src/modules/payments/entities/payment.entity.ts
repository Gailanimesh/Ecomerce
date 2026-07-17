import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../enums/payment.enums';

import { PaymentMethods } from '../enums/payment-method.enum';
@Entity('payments')
export class Payment extends BaseEntity {
    @OneToOne(()=> Order, (order) => order.payment)
    @JoinColumn({
        name: 'orderId',
    })
    order!: Order;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status!: PaymentStatus;
    @Column({
        type: 'enum',
        enum: PaymentMethods,
    })
    method!: PaymentMethods;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
    })
    amount!: string;
    
    @Column({
        nullable:true
    })
    transactionReference!: string;

    @Column()
    provider!: string;


    @Column({
        type: 'timestamp',
        nullable: true,
    })
    paidAt!: Date;
    @Column({
        nullable:true
    })
    failureReason!: string;
    


    }