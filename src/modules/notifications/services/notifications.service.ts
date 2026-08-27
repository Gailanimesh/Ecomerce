import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';

import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { EMAIL_PROVIDER } from '../../../integrations/email/interfaces/email-provider.interface';
import type { IEmailProvider } from '../../../integrations/email/interfaces/email-provider.interface';
import { SendEmailInput } from '../../../integrations/email/types/email.types';

import { buildOrderCreatedEmail } from '../templates/order-created.template';
import { buildOrderStatusUpdatedEmail } from '../templates/order-status-updated.template';
import { buildPaymentCompletedEmail } from '../templates/payment-completed.template';
import { buildPaymentFailedEmail } from '../templates/payment-failed.template';
import { buildRefundProcessedEmail } from '../templates/refund.template';
import { buildReviewApprovedEmail } from '../templates/review-approved.template';
import { buildReviewRejectedEmail } from '../templates/review-rejected.template';

import { NotificationQueryDto } from '../dto/notification-query.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from '../dto/notification-response.dto';
import { UnreadCountResponseDto } from '../dto/unread-count-response.dto';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  deduplicationKey: string;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Internal helper: Creates an in-app notification database record.
   * Can participate in an active database transaction via externalManager.
   * Gracefully handles duplicate deduplication keys as an idempotent no-op.
   */
  async createNotification(
    params: CreateNotificationParams,
    externalManager?: EntityManager,
  ): Promise<Notification | null> {
    const manager = externalManager || this.dataSource.manager;
    const notificationRepo = manager.getRepository(Notification);

    // 1. Check existing record first to prevent aborting active PostgreSQL transaction blocks
    const existing = await notificationRepo.findOne({
      where: { userId: params.userId, deduplicationKey: params.deduplicationKey },
    });

    if (existing) {
      this.logger.debug(
        `[Notification Deduplicated] User=${params.userId} Key=${params.deduplicationKey} already exists. Skipping duplicate.`,
      );
      return existing;
    }

    try {
      const notification = notificationRepo.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        deduplicationKey: params.deduplicationKey,
        metadata: params.metadata || null,
        isRead: false,
      });

      return await notificationRepo.save(notification);
    } catch (err: any) {
      const isUniqueViolation =
        err.code === '23505' ||
        err.code === 'ER_DUP_ENTRY' ||
        (err.message &&
          (err.message.includes('unique') ||
            err.message.includes('duplicate') ||
            err.message.includes('deduplicationKey') ||
            err.message.includes('UQ_notifications_user_dedup')));

      if (isUniqueViolation) {
        this.logger.debug(
          `[Notification Deduplicated Race] User=${params.userId} Key=${params.deduplicationKey} caught concurrent duplicate.`,
        );
        return null;
      }

      throw err;
    }
  }

  /**
   * Dispatches email asynchronously post-commit.
   * Encapsulated in a safe error boundary so email failure NEVER throws or affects callers.
   */
  async dispatchEmail(input: SendEmailInput): Promise<void> {
    try {
      await this.emailProvider.sendEmail(input);
    } catch (error: any) {
      this.logger.warn(
        `[EMAIL_DISPATCH_FAILED] to=${input.to} subject="${input.subject}" error="${error?.message || error}"`,
      );
    }
  }

  // ==========================================
  // Domain Event Notification Methods
  // ==========================================

  /**
   * Triggered when an Order is placed (ORDER_CREATED).
   */
  async notifyOrderCreated(
    order: {
      id: string;
      orderNumber: string;
      subtotal: string | number;
      discount: string | number;
      shippingFee: string | number;
      grandTotal: string | number;
      items?: any[];
    },
    user: { id: string; email: string; fullName: string },
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `order-created:${order.id}`;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.ORDER_CREATED,
        title: `Order Confirmation #${order.orderNumber}`,
        message: `Your order #${order.orderNumber} has been placed successfully for ₹${Number(order.grandTotal).toFixed(2)}.`,
        deduplicationKey,
        metadata: {
          resourceType: 'ORDER',
          resourceId: order.id,
          orderNumber: order.orderNumber,
        },
      },
      externalManager,
    );

    const emailContent = buildOrderCreatedEmail({
      userName: user.fullName || 'Valued Customer',
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      grandTotal: order.grandTotal,
      itemCount: order.items?.length || 1,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  /**
   * Triggered when an Order transitions fulfillment milestones (ORDER_STATUS_UPDATED).
   */
  async notifyOrderStatusUpdated(
    order: {
      id: string;
      orderNumber: string;
      trackingNumber?: string;
      notes?: string;
    },
    previousStatus: string,
    newStatus: string,
    user: { id: string; email: string; fullName: string },
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `order-status:${order.id}:${newStatus}`;
    const statusFormatted = newStatus.replace(/_/g, ' ');

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.ORDER_STATUS_UPDATED,
        title: `Order #${order.orderNumber} Status: ${statusFormatted}`,
        message: `Your order #${order.orderNumber} status has been updated to ${statusFormatted}.`,
        deduplicationKey,
        metadata: {
          resourceType: 'ORDER',
          resourceId: order.id,
          orderNumber: order.orderNumber,
          previousStatus,
          newStatus,
        },
      },
      externalManager,
    );

    // Send emails for customer-relevant milestone statuses
    const customerEmailMilestones = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (customerEmailMilestones.includes(newStatus)) {
      const emailContent = buildOrderStatusUpdatedEmail({
        userName: user.fullName || 'Valued Customer',
        orderNumber: order.orderNumber,
        status: newStatus,
        trackingNumber: order.trackingNumber,
        notes: order.notes,
      });

      void this.dispatchEmail({
        to: user.email,
        ...emailContent,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, status: newStatus },
      });
    }
  }

  /**
   * Triggered when Payment succeeds (PAYMENT_COMPLETED).
   */
  async notifyPaymentCompleted(
    payment: {
      id: string;
      paymentMethod?: string;
      transactionReference?: string;
      amount?: string | number;
    },
    order: { id: string; orderNumber: string; grandTotal: string | number },
    user: { id: string; email: string; fullName: string },
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `payment-completed:${payment.id}`;
    const amount = payment.amount || order.grandTotal;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.PAYMENT_COMPLETED,
        title: `Payment Received for Order #${order.orderNumber}`,
        message: `Your payment of ₹${Number(amount).toFixed(2)} for order #${order.orderNumber} was confirmed.`,
        deduplicationKey,
        metadata: {
          resourceType: 'PAYMENT',
          resourceId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      },
      externalManager,
    );

    const emailContent = buildPaymentCompletedEmail({
      userName: user.fullName || 'Valued Customer',
      orderNumber: order.orderNumber,
      amount,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { paymentId: payment.id, orderId: order.id },
    });
  }

  /**
   * Triggered when Payment fails (PAYMENT_FAILED).
   */
  async notifyPaymentFailed(
    payment: { id: string; amount?: string | number },
    order: { id: string; orderNumber: string; grandTotal: string | number },
    user: { id: string; email: string; fullName: string },
    reason?: string,
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `payment-failed:${payment.id}`;
    const amount = payment.amount || order.grandTotal;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.PAYMENT_FAILED,
        title: `Payment Failed for Order #${order.orderNumber}`,
        message: `Your payment attempt for order #${order.orderNumber} could not be completed.${reason ? ` (${reason})` : ''}`,
        deduplicationKey,
        metadata: {
          resourceType: 'PAYMENT',
          resourceId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason,
        },
      },
      externalManager,
    );

    const emailContent = buildPaymentFailedEmail({
      userName: user.fullName || 'Valued Customer',
      orderNumber: order.orderNumber,
      amount,
      reason,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { paymentId: payment.id, orderId: order.id },
    });
  }

  /**
   * Triggered when a Payment refund is issued (PAYMENT_REFUNDED).
   */
  async notifyPaymentRefunded(
    payment: { id: string },
    order: { id: string; orderNumber: string },
    user: { id: string; email: string; fullName: string },
    refundAmount: string | number,
    reason?: string,
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `payment-refunded:${payment.id}`;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.PAYMENT_REFUNDED,
        title: `Refund Processed for Order #${order.orderNumber}`,
        message: `A refund of ₹${Number(refundAmount).toFixed(2)} has been issued for order #${order.orderNumber}.`,
        deduplicationKey,
        metadata: {
          resourceType: 'PAYMENT',
          resourceId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          refundAmount,
        },
      },
      externalManager,
    );

    const emailContent = buildRefundProcessedEmail({
      userName: user.fullName || 'Valued Customer',
      orderNumber: order.orderNumber,
      refundAmount,
      reason,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { paymentId: payment.id, orderId: order.id },
    });
  }

  /**
   * Triggered when a customer Review is approved (REVIEW_APPROVED).
   */
  async notifyReviewApproved(
    review: { id: string; rating: number },
    product: { id: string; name: string },
    user: { id: string; email: string; fullName: string },
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `review-approved:${review.id}`;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.REVIEW_APPROVED,
        title: `Review Published for "${product.name}"`,
        message: `Your ${review.rating}-star review for "${product.name}" has been approved and published!`,
        deduplicationKey,
        metadata: {
          resourceType: 'REVIEW',
          resourceId: review.id,
          productId: product.id,
          productName: product.name,
        },
      },
      externalManager,
    );

    const emailContent = buildReviewApprovedEmail({
      userName: user.fullName || 'Valued Customer',
      productName: product.name,
      rating: review.rating,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { reviewId: review.id, productId: product.id },
    });
  }

  /**
   * Triggered when a customer Review is rejected (REVIEW_REJECTED).
   */
  async notifyReviewRejected(
    review: { id: string },
    product: { id: string; name: string },
    user: { id: string; email: string; fullName: string },
    moderationReason?: string,
    externalManager?: EntityManager,
  ): Promise<void> {
    const deduplicationKey = `review-rejected:${review.id}`;

    await this.createNotification(
      {
        userId: user.id,
        type: NotificationType.REVIEW_REJECTED,
        title: `Review Update for "${product.name}"`,
        message: `Your review for "${product.name}" requires revisions before publication.${moderationReason ? ` Reason: ${moderationReason}` : ''}`,
        deduplicationKey,
        metadata: {
          resourceType: 'REVIEW',
          resourceId: review.id,
          productId: product.id,
          productName: product.name,
          moderationReason,
        },
      },
      externalManager,
    );

    const emailContent = buildReviewRejectedEmail({
      userName: user.fullName || 'Valued Customer',
      productName: product.name,
      moderationReason,
    });

    void this.dispatchEmail({
      to: user.email,
      ...emailContent,
      metadata: { reviewId: review.id, productId: product.id },
    });
  }

  // ==========================================
  // In-App Customer Notification Endpoints
  // ==========================================

  /**
   * Lists paginated notifications for the authenticated user.
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    if (query.unreadOnly) {
      qb.andWhere('n.isRead = :isRead', { isRead: false });
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    };
  }

  /**
   * Retrieves the unread notification count for the authenticated user.
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * Marks a single notification as read, enforcing user ownership.
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found.`);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return this.mapToResponseDto(notification);
  }

  /**
   * Marks all unread notifications for the authenticated user as read.
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return { updatedCount: result.affected || 0 };
  }

  /**
   * Deletes a notification, enforcing user ownership.
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found.`);
    }

    await this.notificationRepository.remove(notification);
  }

  private mapToResponseDto(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      metadata: entity.metadata,
      isRead: entity.isRead,
      readAt: entity.readAt || null,
      createdAt: entity.createdAt,
    };
  }
}
