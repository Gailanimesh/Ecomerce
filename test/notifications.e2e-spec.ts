import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/users/entities/role.entity';
import { Address } from '../src/modules/users/entities/address.entity';
import { Product } from '../src/modules/catalog/entities/product.entity';
import { ProductVariant } from '../src/modules/catalog/entities/product-variant.entity';
import { Brand } from '../src/modules/catalog/entities/brand.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Inventory } from '../src/modules/inventory/entities/inventory.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { NotificationType } from '../src/modules/notifications/enums/notification-type.enum';
import { RoleEnum } from '../src/common/enums/roles.enum';
import { ProductStatus } from '../src/modules/catalog/enum/productstaus.enum';
import { EMAIL_PROVIDER } from '../src/integrations/email/interfaces/email-provider.interface';
import { MockEmailProvider } from '../src/integrations/email/providers/mock-email.provider';
import { OrdersService } from '../src/modules/orders/services/orders.service';

jest.setTimeout(60000);

describe('Notifications & Email Infrastructure Module (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let addressRepository: Repository<Address>;
  let brandRepository: Repository<Brand>;
  let categoryRepository: Repository<Category>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let inventoryRepository: Repository<Inventory>;
  let orderRepository: Repository<Order>;
  let notificationRepository: Repository<Notification>;
  let mockEmailProvider: MockEmailProvider;
  let ordersService: OrdersService;

  let adminAccessToken: string;
  let customer1AccessToken: string;
  let customer2AccessToken: string;
  let customer1User: any;
  let customer2User: any;
  let customer1Address: Address;
  let testVariant: ProductVariant;
  let testProduct: Product;
  let createdOrderId: string;
  let createdNotificationId: string;

  const timestamp = Date.now();
  const adminCredentials = {
    email: `admin_notif_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'Manager',
  };

  const customer1Credentials = {
    email: `customer1_notif_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Alice',
    lastName: 'Shopper',
  };

  const customer2Credentials = {
    email: `customer2_notif_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Bob',
    lastName: 'Buyer',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = app.get<Repository<Role>>(getRepositoryToken(Role));
    addressRepository = app.get<Repository<Address>>(getRepositoryToken(Address));
    brandRepository = app.get<Repository<Brand>>(getRepositoryToken(Brand));
    categoryRepository = app.get<Repository<Category>>(getRepositoryToken(Category));
    productRepository = app.get<Repository<Product>>(getRepositoryToken(Product));
    variantRepository = app.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    inventoryRepository = app.get<Repository<Inventory>>(getRepositoryToken(Inventory));
    orderRepository = app.get<Repository<Order>>(getRepositoryToken(Order));
    notificationRepository = app.get<Repository<Notification>>(getRepositoryToken(Notification));
    mockEmailProvider = app.get<MockEmailProvider>(EMAIL_PROVIDER);
    ordersService = app.get<OrdersService>(OrdersService);

    // Register & Login Customer 1
    const reg1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer1Credentials)
      .expect(201);
    customer1User = reg1.body.user;

    const login1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customer1Credentials.email, password: customer1Credentials.password })
      .expect(201);
    customer1AccessToken = login1.body.accessToken;

    // Register & Login Customer 2
    const reg2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer2Credentials)
      .expect(201);
    customer2User = reg2.body.user;

    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customer2Credentials.email, password: customer2Credentials.password })
      .expect(201);
    customer2AccessToken = login2.body.accessToken;

    // Register & Promote Admin
    const regAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCredentials)
      .expect(201);

    const adminRole = await roleRepository.findOne({ where: { name: RoleEnum.ADMIN } });
    if (adminRole) {
      await userRepository.update(regAdmin.body.user.id, { role: adminRole });
    }

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCredentials.email, password: adminCredentials.password })
      .expect(201);
    adminAccessToken = adminLogin.body.accessToken;

    // Seed Address for Customer 1
    customer1Address = await addressRepository.save(
      addressRepository.create({
        user: { id: customer1User.id } as User,
        street1: '456 Notification Ave',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
        isDefault: true,
      }),
    );

    // Seed Brand, Category, Product, Variant, Inventory
    const brand = await brandRepository.save(
      brandRepository.create({
        name: `Notif Brand ${timestamp}`,
        slug: `notif-brand-${timestamp}`,
      }),
    );

    const category = await categoryRepository.save(
      categoryRepository.create({
        name: `Notif Category ${timestamp}`,
        slug: `notif-cat-${timestamp}`,
      }),
    );

    testProduct = await productRepository.save(
      productRepository.create({
        name: `Notif Test Product ${timestamp}`,
        slug: `notif-product-${timestamp}`,
        status: ProductStatus.ACTIVE,
        brand,
        category,
      }),
    );

    testVariant = await variantRepository.save(
      variantRepository.create({
        sku: `SKU-NOTIF-${timestamp}`,
        slug: `sku-notif-${timestamp}`,
        price: '150.00',
        isActive: true,
        product: testProduct,
      }),
    );

    await inventoryRepository.save(
      inventoryRepository.create({
        variant: testVariant,
        productVariantId: testVariant.id,
        availableQuantity: 50,
        reservedQuantity: 0,
      }),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Order Creation & In-App Notification Flow', () => {
    it('should create in-app notification and dispatch mock email upon order checkout', async () => {
      // 1. Add item to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          productVariantId: testVariant.id,
          quantity: 2,
        })
        .expect(201);

      // 2. Checkout
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          addressId: customer1Address.id,
        })
        .expect(201);

      createdOrderId = checkoutRes.body.order.id;

      // 3. Verify unread notifications count
      const unreadRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(unreadRes.body.count).toBeGreaterThanOrEqual(1);

      // 4. Verify in-app notifications list
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(listRes.body.items.length).toBeGreaterThanOrEqual(1);
      const orderCreatedNotif = listRes.body.items.find(
        (n: any) => n.type === NotificationType.ORDER_CREATED,
      );
      expect(orderCreatedNotif).toBeDefined();
      expect(orderCreatedNotif.metadata?.resourceType).toBe('ORDER');
      expect(orderCreatedNotif.metadata?.resourceId).toBe(createdOrderId);
      expect(orderCreatedNotif.isRead).toBe(false);

      createdNotificationId = orderCreatedNotif.id;

      // 5. Verify email was dispatched via MockEmailProvider
      const sentEmails = mockEmailProvider.getSentEmailsByRecipient(customer1Credentials.email);
      expect(sentEmails.length).toBeGreaterThanOrEqual(1);
      const confirmationEmail = sentEmails.find((e) => e.subject.includes('Order Confirmation'));
      expect(confirmationEmail).toBeDefined();
      expect(confirmationEmail?.html).toContain('₹300.00');
    });

    it('should mark single notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdNotificationId);
      expect(res.body.isRead).toBe(true);
      expect(res.body.readAt).toBeDefined();
    });

    it('should enforce user ownership when marking notification as read', async () => {
      // Customer 2 attempts to mark Customer 1's notification
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${customer2AccessToken}`)
        .expect(404);
    });
  });

  describe('Order Status Update & Payment Integration', () => {
    it('should create ORDER_STATUS_UPDATED notification upon payment confirmation', async () => {
      // Confirm payment transition PENDING_PAYMENT -> CONFIRMED
      await ordersService.confirmPayment(createdOrderId, 'mock_txn_ref_notif');

      // Check Customer 1 notifications
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      const statusNotif = listRes.body.items.find(
        (n: any) => n.type === NotificationType.ORDER_STATUS_UPDATED,
      );
      expect(statusNotif).toBeDefined();
      expect(statusNotif.title).toContain('CONFIRMED');

      // Check email was dispatched
      const sentEmails = mockEmailProvider.getSentEmailsByRecipient(customer1Credentials.email);
      const confirmedEmail = sentEmails.find((e) => e.subject.includes('CONFIRMED'));
      expect(confirmedEmail).toBeDefined();
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(res.body.updatedCount).toBeGreaterThanOrEqual(1);

      // Verify unread count is now 0
      const unreadRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(unreadRes.body.count).toBe(0);
    });
  });

  describe('Notification Deletion', () => {
    it('should prevent deleting another user notification with 404', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${createdNotificationId}`)
        .set('Authorization', `Bearer ${customer2AccessToken}`)
        .expect(404);
    });

    it('should delete own notification with 204 No Content', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${createdNotificationId}`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(204);

      // Verify deleted from DB
      const inDb = await notificationRepository.findOne({ where: { id: createdNotificationId } });
      expect(inDb).toBeNull();
    });
  });
});
