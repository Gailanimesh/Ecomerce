import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderHistory } from './order-history.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentMethods } from '../../payments/enums/payment-method.enum';

@Entity('orders')
export class Order extends BaseEntity {
  @Index()
  @Column({ unique: true })
  orderNumber!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
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
    default: 0,
  })
  discount!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  tax!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingFee!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  grandTotal!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethods,
    nullable: true,
  })
  paymentMethod?: PaymentMethods;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  paymentExpiresAt?: Date;

  @Column()
  shippingName!: string;

  @Column()
  shippingPhone!: string;

  @Column()
  shippingStreet!: string;

  @Column({
    nullable: true,
  })
  shippingAddressLine2?: string;

  @Column()
  shippingCity!: string;

  @Column()
  shippingState!: string;

  @Column()
  shippingCountry!: string;

  @Column()
  shippingPostalCode!: string;

  @Column({
    nullable: true,
  })
  notes?: string;

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
    cascade: true,
    onDelete: 'CASCADE',
  })
  orderItems!: OrderItem[];

  @OneToMany(() => OrderHistory, (history) => history.order, {
    cascade: true,
  })
  history!: OrderHistory[];

  @OneToOne(() => Payment, (payment) => payment.order, {
    nullable: true,
  })
  payment?: Payment;

  get recipientName(): string {
    return this.shippingName;
  }

  get recipientPhone(): string {
    return this.shippingPhone;
  }

  get shippingAddressLine1(): string {
    return this.shippingStreet;
  }
}