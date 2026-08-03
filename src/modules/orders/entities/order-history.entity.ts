import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('order_histories')
export class OrderHistory extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @Column({ nullable: true })
  changedByUserId?: string;

  @Column({ default: 'SYSTEM' })
  changedByRole!: string;

  @Column({ nullable: true })
  changeReason?: string;

  @Column({ nullable: true })
  notes?: string;
}
