import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
@Unique('UQ_notifications_user_dedup', ['userId', 'deduplicationKey'])
@Index('IDX_notifications_user_is_read', ['userId', 'isRead'])
@Index('IDX_notifications_user_created_at', ['userId', 'createdAt'])
export class Notification extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any> | null;

  @Column({ default: false })
  isRead!: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  readAt?: Date | null;

  @Column({ type: 'varchar', length: 150 })
  deduplicationKey!: string;
}
