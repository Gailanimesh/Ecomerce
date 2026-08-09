import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';

@Entity('webhook_events')
export class WebhookEvent extends BaseEntity {
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.RAZORPAY,
  })
  provider!: PaymentProvider;

  @Column({
    unique: true,
  })
  eventId!: string;

  @Column({
    nullable: true,
  })
  eventType?: string;

  @Column({
    nullable: true,
  })
  signature?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  headers?: Record<string, any>;

  @Column({
    type: 'jsonb',
  })
  payload!: Record<string, any>;

  @Column({
    type: 'enum',
    enum: WebhookStatus,
    default: WebhookStatus.RECEIVED,
  })
  status!: WebhookStatus;

  @Column({
    nullable: true,
  })
  failureReason?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  receivedAt!: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  processedAt?: Date;
}
