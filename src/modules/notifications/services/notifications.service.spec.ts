import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { EMAIL_PROVIDER } from '../../../integrations/email/interfaces/email-provider.interface';
import { MockEmailProvider } from '../../../integrations/email/providers/mock-email.provider';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let mockEmailProvider: MockEmailProvider;
  let mockDataSource: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'alice@example.com',
    fullName: 'Alice Smith',
  };

  const sampleNotification: Partial<Notification> = {
    id: 'notif-uuid-1',
    userId: mockUser.id,
    type: NotificationType.ORDER_CREATED,
    title: 'Order Confirmation #ORD-1001',
    message: 'Your order #ORD-1001 was placed.',
    deduplicationKey: 'order-created:order-uuid-1',
    metadata: { resourceType: 'ORDER', resourceId: 'order-uuid-1' },
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockEmailProvider = new MockEmailProvider();

    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'notif-uuid-1' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      manager: {
        getRepository: jest.fn().mockReturnValue(mockRepo),
        save: jest.fn().mockImplementation((_, entity) => Promise.resolve(entity)),
        findOne: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepo,
        },
        {
          provide: EMAIL_PROVIDER,
          useValue: mockEmailProvider,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEmailProvider.clearSentEmails();
  });

  describe('createNotification (Idempotency & Transaction Safety)', () => {
    it('should create an in-app notification database record', async () => {
      const result = await service.createNotification({
        userId: mockUser.id,
        type: NotificationType.ORDER_CREATED,
        title: 'Order Created',
        message: 'Order was placed',
        deduplicationKey: 'order-created:order-1',
      });

      expect(result).toBeDefined();
      expect(result?.deduplicationKey).toBe('order-created:order-1');
    });

    it('should handle PostgreSQL 23505 unique constraint violation gracefully as an idempotent no-op', async () => {
      const mockRepoInTx = {
        create: jest.fn().mockReturnValue(sampleNotification),
        save: jest.fn().mockRejectedValue({
          code: '23505',
          message: 'duplicate key value violates unique constraint UQ_notifications_user_dedup',
        }),
        findOne: jest.fn().mockResolvedValue(sampleNotification),
      };

      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockRepoInTx),
      } as unknown as EntityManager;

      const result = await service.createNotification(
        {
          userId: mockUser.id,
          type: NotificationType.ORDER_CREATED,
          title: 'Order Created',
          message: 'Order was placed',
          deduplicationKey: 'order-created:order-1',
        },
        mockManager,
      );

      expect(result).toEqual(sampleNotification);
      expect(mockRepoInTx.findOne).toHaveBeenCalledWith({
        where: { userId: mockUser.id, deduplicationKey: 'order-created:order-1' },
      });
    });

    it('should rethrow unrelated database errors', async () => {
      const mockRepoInTx = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(sampleNotification),
        save: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockRepoInTx),
      } as unknown as EntityManager;

      await expect(
        service.createNotification(
          {
            userId: mockUser.id,
            type: NotificationType.ORDER_CREATED,
            title: 'Order Created',
            message: 'Order was placed',
            deduplicationKey: 'order-created:order-1',
          },
          mockManager,
        ),
      ).rejects.toThrow('Database connection lost');
    });
  });

  describe('dispatchEmail (Safe Error Boundary)', () => {
    it('should send email and record it via mock email provider', async () => {
      await service.dispatchEmail({
        to: 'customer@example.com',
        subject: 'Welcome',
        html: '<p>Welcome to our store!</p>',
        text: 'Welcome to our store!',
      });

      const sent = mockEmailProvider.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe('customer@example.com');
      expect(sent[0].subject).toBe('Welcome');
    });

    it('should catch email provider errors and not throw to caller', async () => {
      jest.spyOn(mockEmailProvider, 'sendEmail').mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        service.dispatchEmail({
          to: 'customer@example.com',
          subject: 'Welcome',
          html: '<p>Welcome</p>',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Domain Event Triggers', () => {
    it('notifyOrderCreated should create notification and dispatch confirmation email', async () => {
      await service.notifyOrderCreated(
        {
          id: 'order-123',
          orderNumber: 'ORD-123',
          subtotal: '200.00',
          discount: '20.00',
          shippingFee: '0.00',
          grandTotal: '180.00',
        },
        mockUser,
      );

      const sent = mockEmailProvider.getSentEmailsByRecipient(mockUser.email);
      expect(sent.length).toBe(1);
      expect(sent[0].subject).toContain('ORD-123');
      expect(sent[0].html).toContain('₹180.00');
    });

    it('notifyOrderStatusUpdated should dispatch email for customer milestones (e.g. SHIPPED)', async () => {
      await service.notifyOrderStatusUpdated(
        {
          id: 'order-123',
          orderNumber: 'ORD-123',
          notes: 'Tracking ID: TRK-999',
        },
        'PROCESSING',
        'SHIPPED',
        mockUser,
      );

      const sent = mockEmailProvider.getSentEmailsByRecipient(mockUser.email);
      expect(sent.length).toBe(1);
      expect(sent[0].subject).toContain('SHIPPED');
    });

    it('notifyPaymentCompleted should dispatch payment receipt email', async () => {
      await service.notifyPaymentCompleted(
        {
          id: 'payment-123',
          paymentMethod: 'CARD',
          transactionReference: 'pay_98765',
          amount: '180.00',
        },
        {
          id: 'order-123',
          orderNumber: 'ORD-123',
          grandTotal: '180.00',
        },
        mockUser,
      );

      const sent = mockEmailProvider.getSentEmailsByRecipient(mockUser.email);
      expect(sent.length).toBe(1);
      expect(sent[0].subject).toContain('Payment Successful');
      expect(sent[0].html).toContain('₹180.00');
    });

    it('notifyReviewApproved should dispatch review publication email', async () => {
      await service.notifyReviewApproved(
        { id: 'review-1', rating: 5 },
        { id: 'prod-1', name: 'Running Shoes' },
        mockUser,
      );

      const sent = mockEmailProvider.getSentEmailsByRecipient(mockUser.email);
      expect(sent.length).toBe(1);
      expect(sent[0].subject).toContain('Running Shoes');
      expect(sent[0].html).toContain('5/5');
    });

    it('notifyReviewRejected should dispatch moderation feedback email', async () => {
      await service.notifyReviewRejected(
        { id: 'review-1' },
        { id: 'prod-1', name: 'Running Shoes' },
        mockUser,
        'Review contains offensive language',
      );

      const sent = mockEmailProvider.getSentEmailsByRecipient(mockUser.email);
      expect(sent.length).toBe(1);
      expect(sent[0].subject).toContain('Running Shoes');
      expect(sent[0].html).toContain('offensive language');
    });
  });

  describe('Customer In-App Management', () => {
    it('getUnreadCount should return count of unread notifications', async () => {
      notificationRepository.count.mockResolvedValue(3);

      const res = await service.getUnreadCount(mockUser.id);
      expect(res.count).toBe(3);
      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRead: false },
      });
    });

    it('markAsRead should update isRead to true for owned notification', async () => {
      const unreadNotif = { ...sampleNotification, isRead: false } as Notification;
      notificationRepository.findOne.mockResolvedValue(unreadNotif);
      notificationRepository.save.mockImplementation((n) => Promise.resolve(n as Notification));

      const res = await service.markAsRead(mockUser.id, 'notif-uuid-1');
      expect(res.isRead).toBe(true);
      expect(res.readAt).toBeDefined();
    });

    it('markAsRead should throw NotFoundException if notification does not belong to user', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('other-user', 'notif-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('markAllAsRead should update all unread notifications of user', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 4, raw: [], generatedMaps: [] });

      const res = await service.markAllAsRead(mockUser.id);
      expect(res.updatedCount).toBe(4);
      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id, isRead: false },
        expect.objectContaining({ isRead: true }),
      );
    });

    it('deleteNotification should remove owned notification', async () => {
      notificationRepository.findOne.mockResolvedValue(sampleNotification as Notification);
      notificationRepository.remove.mockResolvedValue(sampleNotification as Notification);

      await expect(service.deleteNotification(mockUser.id, 'notif-uuid-1')).resolves.not.toThrow();
      expect(notificationRepository.remove).toHaveBeenCalledWith(sampleNotification);
    });

    it('deleteNotification should throw NotFoundException if notification is not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification(mockUser.id, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
