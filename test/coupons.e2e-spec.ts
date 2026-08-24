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
import { Coupon } from '../src/modules/coupons/entities/coupon.entity';
import { CouponUsage } from '../src/modules/coupons/entities/coupon-usage.entity';
import { DiscountType } from '../src/modules/coupons/enums/discount-type.enum';
import { RoleEnum } from '../src/common/enums/roles.enum';
import { ProductStatus } from '../src/modules/catalog/enum/productstaus.enum';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { OrdersService } from '../src/modules/orders/services/orders.service';

jest.setTimeout(60000);

describe('Coupons & Discounts Module (e2e)', () => {
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
  let couponRepository: Repository<Coupon>;
  let couponUsageRepository: Repository<CouponUsage>;
  let ordersService: OrdersService;

  let adminAccessToken: string;
  let customer1AccessToken: string;
  let customer2AccessToken: string;
  let customer1User: any;
  let customer1Address: Address;
  let testVariant: ProductVariant;
  let testCouponId: string;
  let createdOrder: any;

  const timestamp = Date.now();
  const adminCredentials = {
    email: `admin_coupons_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'Manager',
  };

  const customer1Credentials = {
    email: `customer1_coupons_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Alice',
    lastName: 'Shopper',
  };

  const customer2Credentials = {
    email: `customer2_coupons_${timestamp}@example.com`,
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
    couponRepository = app.get<Repository<Coupon>>(getRepositoryToken(Coupon));
    couponUsageRepository = app.get<Repository<CouponUsage>>(getRepositoryToken(CouponUsage));
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
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer2Credentials)
      .expect(201);

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
        street1: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001',
        isDefault: true,
      }),
    );

    // Seed Brand, Category, Product, Variant
    const brand = await brandRepository.save(
      brandRepository.create({
        name: `Coupon Brand ${timestamp}`,
        slug: `coupon-brand-${timestamp}`,
      }),
    );

    const category = await categoryRepository.save(
      categoryRepository.create({
        name: `Coupon Category ${timestamp}`,
        slug: `coupon-cat-${timestamp}`,
      }),
    );

    const product = await productRepository.save(
      productRepository.create({
        name: `Coupon Test Product ${timestamp}`,
        slug: `coupon-product-${timestamp}`,
        status: ProductStatus.ACTIVE,
        brand,
        category,
      }),
    );

    testVariant = await variantRepository.save(
      variantRepository.create({
        sku: `SKU-CPN-${timestamp}`,
        slug: `sku-cpn-${timestamp}`,
        price: '100.00',
        isActive: true,
        product,
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

  describe('Admin Coupon Lifecycle Management', () => {
    it('should create a percentage coupon promotion with minimum order and max cap', async () => {
      const startsAt = new Date(Date.now() - 60000).toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          code: `SAVE20_${timestamp}`,
          description: '20% off with max cap of ₹50 on orders above ₹150',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          maxDiscountAmount: 50,
          minimumOrderAmount: 150,
          startsAt,
          expiresAt,
          usageLimit: 100,
          perUserUsageLimit: 1,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.code).toBe(`SAVE20_${timestamp}`);
      expect(res.body.discountValue).toBe(20);
      expect(res.body.usedCount).toBe(0);
      expect(res.body.isActive).toBe(true);

      testCouponId = res.body.id;
    });

    it('should reject creating duplicate coupon code with 409 Conflict', async () => {
      const startsAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 100000).toISOString();

      await request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          code: `save20_${timestamp}`, // Case-insensitive duplicate
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          startsAt,
          expiresAt,
        })
        .expect(409);
    });

    it('should list coupons in admin list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ search: `SAVE20_${timestamp}` })
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].code).toBe(`SAVE20_${timestamp}`);
    });
  });

  describe('Customer Cart Coupon Preview', () => {
    it('should reject preview on empty cart with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({ code: `SAVE20_${timestamp}` })
        .expect(400);
    });

    it('should calculate authoritative preview discount on active cart', async () => {
      // Add 2 units of ₹100 product (subtotal = ₹200)
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          productVariantId: testVariant.id,
          quantity: 2,
        })
        .expect(201);

      // 20% of ₹200 = ₹40 (within ₹50 cap)
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({ code: `save20_${timestamp}` }) // lowercase test
        .expect(201);

      expect(res.body.couponCode).toBe(`SAVE20_${timestamp}`);
      expect(res.body.subtotal).toBe(200);
      expect(res.body.discount).toBe(40);
      expect(res.body.totalAfterDiscount).toBe(160);
    });

    it('should allow clearing coupon preview from cart', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(res.body.summary.subtotal).toBe(200);
    });
  });

  describe('Checkout with Authoritative Coupon Pricing', () => {
    it('should checkout with coupon and create Order in PENDING_PAYMENT with discount snapshot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          addressId: customer1Address.id,
          couponCode: `SAVE20_${timestamp}`,
        })
        .expect(201);

      createdOrder = res.body.order;
      expect(createdOrder.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(createdOrder.subtotal).toBe(200);
      expect(createdOrder.discount).toBe(40);
      expect(createdOrder.grandTotal).toBe(160);

      // Verify in DB: Coupon usage is NOT consumed during PENDING_PAYMENT checkout
      const couponInDb = await couponRepository.findOne({ where: { id: testCouponId } });
      expect(couponInDb?.usedCount).toBe(0);

      const usageCount = await couponUsageRepository.count({ where: { couponId: testCouponId } });
      expect(usageCount).toBe(0);
    });
  });

  describe('Payment Confirmation & Atomic Coupon Consumption', () => {
    it('should consume coupon usage atomically when order transitions to CONFIRMED', async () => {
      // Simulate payment confirmation hook via OrdersService
      await ordersService.confirmPayment(createdOrder.id, 'mock_txn_ref_123');

      // Verify in DB: Coupon usage is now consumed
      const couponInDb = await couponRepository.findOne({ where: { id: testCouponId } });
      expect(couponInDb?.usedCount).toBe(1);

      const usage = await couponUsageRepository.findOne({
        where: { orderId: createdOrder.id, couponId: testCouponId },
      });
      expect(usage).toBeDefined();
      expect(usage?.discountAmount).toBe('40.00');
      expect(usage?.userId).toBe(customer1User.id);
    });

    it('should be idempotent and not increment usedCount again on duplicate confirmation', async () => {
      // Transition again to test idempotency guard
      await ordersService.confirmPayment(createdOrder.id, 'mock_txn_ref_duplicate');

      const couponInDb = await couponRepository.findOne({ where: { id: testCouponId } });
      expect(couponInDb?.usedCount).toBe(1);

      const count = await couponUsageRepository.count({
        where: { orderId: createdOrder.id, couponId: testCouponId },
      });
      expect(count).toBe(1);
    });

    it('should enforce per-user usage limit on second checkout attempt by same customer', async () => {
      // Add items to cart again
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          productVariantId: testVariant.id,
          quantity: 2,
        })
        .expect(201);

      // Attempt checkout with same single-use coupon
      await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          addressId: customer1Address.id,
          couponCode: `SAVE20_${timestamp}`,
        })
        .expect(400);
    });

    it('should return coupon usage audit history to Admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/coupons/${testCouponId}/usage`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].orderId).toBe(createdOrder.id);
      expect(res.body.items[0].discountAmount).toBe(40);
    });
  });
});
