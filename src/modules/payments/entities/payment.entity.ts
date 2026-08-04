import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { PaymentStatus, PaymentFailureCode } from '../enums/payment.enums';
import { PaymentMethods } from '../enums/payment-method.enum';
import { PaymentProvider } from '../enums/payment-provider.enum';

@Entity('payments')
export class Payment extends BaseEntity {
  @OneToOne(() => Order, (order) => order.payment)
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
    nullable: true,
  })
  transactionReference!: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.RAZORPAY,
  })
  provider!: PaymentProvider;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  paidAt!: Date;

  @Column({
    type: 'enum',
    enum: PaymentFailureCode,
    nullable: true,
  })
  failureCode?: PaymentFailureCode;

  @Column({
    nullable: true,
  })
  failureReason!: string;
}