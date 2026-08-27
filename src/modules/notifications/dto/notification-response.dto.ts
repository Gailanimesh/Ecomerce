import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.ORDER_CREATED })
  type!: NotificationType;

  @ApiProperty({ example: 'Order Confirmation #ORD-20260824-001' })
  title!: string;

  @ApiProperty({ example: 'Your order #ORD-20260824-001 has been placed successfully.' })
  message!: string;

  @ApiPropertyOptional({
    example: { resourceType: 'ORDER', resourceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', orderNumber: 'ORD-20260824-001' },
  })
  metadata?: Record<string, any> | null;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiPropertyOptional({ example: null })
  readAt?: Date | null;

  @ApiProperty({ example: '2026-08-24T10:00:00.000Z' })
  createdAt!: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty({ example: 3 })
  unreadCount!: number;
}
