import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/users/entities/role.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Brand } from '../src/modules/catalog/entities/brand.entity';
import { Product } from '../src/modules/catalog/entities/product.entity';
import { ProductVariant } from '../src/modules/catalog/entities/product-variant.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { OrderItem } from '../src/modules/orders/entities/order-item.entity';
import { Review } from '../src/modules/reviews/entities/review.entity';
import { RoleEnum } from '../src/common/enums/roles.enum';
import { ProductStatus } from '../src/modules/catalog/enum/productstaus.enum';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { ReviewStatus } from '../src/modules/reviews/enums/review-status.enum';

describe('Reviews Module (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let categoryRepository: Repository<Category>;
  let brandRepository: Repository<Brand>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let reviewRepository: Repository<Review>;

  let adminAccessToken: string;
  let customer1AccessToken: string;
  let customer2AccessToken: string;
  let customer1User: User;

  let testProduct: Product;
  let testVariant: ProductVariant;
  let testOrder: Order;
  let testOrderItem: OrderItem;

  const timestamp = Date.now();
  const adminCredentials = {
    email: `admin_reviews_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'Moderator',
  };

  const customer1Credentials = {
    email: `customer1_reviews_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Verified',
    lastName: 'Buyer',
  };

  const customer2Credentials = {
    email: `customer2_reviews_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Unverified',
    lastName: 'Shopper',
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
    categoryRepository = app.get<Repository<Category>>(getRepositoryToken(Category));
    brandRepository = app.get<Repository<Brand>>(getRepositoryToken(Brand));
    productRepository = app.get<Repository<Product>>(getRepositoryToken(Product));
    variantRepository = app.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    orderRepository = app.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = app.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    reviewRepository = app.get<Repository<Review>>(getRepositoryToken(Review));

    // Register Customer 1
    const reg1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer1Credentials)
      .expect(201);
    customer1User = reg1.body.user;

    // Register Customer 2
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer2Credentials)
      .expect(201);

    // Register Admin
    const adminReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCredentials)
      .expect(201);

    const adminRole =
      (await roleRepository.findOne({ where: { name: RoleEnum.ADMIN } })) ||
      (await roleRepository.save(roleRepository.create({ name: RoleEnum.ADMIN })));

    await userRepository.update({ id: adminReg.body.user.id }, { role: adminRole });

    // Logins
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCredentials.email, password: adminCredentials.password })
      .expect(201);
    adminAccessToken = adminLogin.body.accessToken;

    const cust1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customer1Credentials.email, password: customer1Credentials.password })
      .expect(201);
    customer1AccessToken = cust1Login.body.accessToken;

    const cust2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customer2Credentials.email, password: customer2Credentials.password })
      .expect(201);
    customer2AccessToken = cust2Login.body.accessToken;

    // Seed test brand, category, product, variant
    const brand = await brandRepository.save(
      brandRepository.create({
        name: `Review Brand ${timestamp}`,
        slug: `review-brand-${timestamp}`,
      }),
    );

    const category = await categoryRepository.save(
      categoryRepository.create({
        name: `Review Category ${timestamp}`,
        slug: `review-cat-${timestamp}`,
      }),
    );

    testProduct = await productRepository.save(
      productRepository.create({
        name: `Review Test Product ${timestamp}`,
        slug: `review-product-${timestamp}`,
        status: ProductStatus.ACTIVE,
        brand,
        category,
      }),
    );

    testVariant = await variantRepository.save(
      variantRepository.create({
        sku: `SKU-REV-${timestamp}`,
        slug: `sku-rev-${timestamp}`,
        price: '99.99',
        product: testProduct,
      }),
    );

    // Seed Order in CONFIRMED state first
    testOrder = await orderRepository.save(
      orderRepository.create({
        orderNumber: `ORD-REV-${Date.now()}`,
        status: OrderStatus.CONFIRMED,
        subtotal: '99.99',
        grandTotal: '99.99',
        shippingName: 'Verified Buyer',
        shippingPhone: '+1234567890',
        shippingStreet: '123 Test St',
        shippingCity: 'City',
        shippingState: 'State',
        shippingCountry: 'US',
        shippingPostalCode: '12345',
        user: customer1User,
      }),
    );

    testOrderItem = await orderItemRepository.save(
      orderItemRepository.create({
        order: testOrder,
        productVariant: testVariant,
        productVariantId: testVariant.id,
        productName: testProduct.name,
        sku: testVariant.sku,
        unitPrice: '99.99',
        quantity: 1,
        lineTotal: '99.99',
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Review Submission & Verified Purchase Check', () => {
    it('should reject unauthenticated review submission with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .send({
          rating: 5,
          content: 'Great product and quick delivery.',
        })
        .expect(401);
    });

    it('should reject review when customer has not purchased the product (Customer 2) with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .set('Authorization', `Bearer ${customer2AccessToken}`)
        .send({
          rating: 5,
          content: 'I did not buy this product yet.',
        })
        .expect(403);

      expect(res.body.message).toContain('Verified purchase required');
    });

    it('should reject review when order is not yet DELIVERED or COMPLETED (still CONFIRMED) with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          rating: 5,
          content: 'Premature review before delivery.',
        })
        .expect(403);

      expect(res.body.message).toContain('Verified purchase required');
    });

    it('should accept review after order status transitions to DELIVERED with 201 Created and PENDING status', async () => {
      // Transition order to DELIVERED
      await orderRepository.update({ id: testOrder.id }, { status: OrderStatus.DELIVERED });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          rating: 5,
          title: 'Outstanding quality and comfort',
          content: 'Received my order today. High quality build and perfect fit.',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(testProduct.id);
      expect(res.body.rating).toBe(5);
      expect(res.body.status).toBe(ReviewStatus.PENDING);
      expect(res.body.isVerifiedPurchase).toBe(true);
      expect(res.body.author.fullName).toBe('Verified Buyer');
    });

    it('should reject second review by same customer for same product with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          rating: 4,
          content: 'Attempting duplicate review submission.',
        })
        .expect(409);

      expect(res.body.message).toContain('already reviewed this product');
    });
  });

  describe('Public & Customer Visibility before Moderation', () => {
    it('should NOT include PENDING review in public product reviews list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.ratingSummary.reviewCount).toBe(0);
      expect(res.body.ratingSummary.averageRating).toBe(0);
    });

    it('should allow customer to view their own PENDING review via GET /api/v1/reviews/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/me')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe(ReviewStatus.PENDING);
    });
  });

  describe('Admin Moderation Workflow', () => {
    let reviewId: string;

    it('should list pending review in admin moderation queue with sanitized user metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/reviews?status=PENDING')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      reviewId = res.body.items[0].id;
      expect(res.body.items[0].user.email).toBe(customer1Credentials.email.toLowerCase());
      expect(res.body.items[0].orderItemId).toBeDefined();
    });

    it('should allow admin to APPROVE review with audit trail', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/reviews/${reviewId}/moderation`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          status: ReviewStatus.APPROVED,
          reason: 'Verified genuine feedback.',
        })
        .expect(200);

      expect(res.body.status).toBe(ReviewStatus.APPROVED);
      expect(res.body.adminReason).toBe('Verified genuine feedback.');
      expect(res.body.moderatedByUserId).toBeDefined();
      expect(res.body.moderatedAt).toBeDefined();
    });

    it('should now display approved review and rating summary publicly', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(reviewId);
      expect(res.body.ratingSummary.reviewCount).toBe(1);
      expect(res.body.ratingSummary.averageRating).toBe(5);
      expect(res.body.ratingSummary.ratingDistribution['5']).toBe(1);
    });

    it('should include rating overview when fetching product details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProduct.id}`)
        .expect(200);

      expect(res.body.rating).toBeDefined();
      expect(res.body.rating.averageRating).toBe(5);
      expect(res.body.rating.reviewCount).toBe(1);
    });
  });

  describe('Customer Edit & Lifecycle Re-moderation', () => {
    let reviewId: string;

    beforeAll(async () => {
      const myReviews = await request(app.getHttpServer())
        .get('/api/v1/reviews/me')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);
      reviewId = myReviews.body.items[0].id;
    });

    it('should reject modification by another user (Customer 2) with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer2AccessToken}`)
        .send({
          rating: 1,
          content: 'Malicious modification attempt.',
        })
        .expect(403);
    });

    it('should allow customer to update review and reset status to PENDING for re-moderation', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .send({
          rating: 4,
          title: 'Updated title after prolonged usage',
          content: 'Updated content: shoes are still great after 30 days of daily use.',
        })
        .expect(200);

      expect(res.body.rating).toBe(4);
      expect(res.body.status).toBe(ReviewStatus.PENDING);
    });

    it('should remove edited review from public list until re-approved', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/products/${testProduct.id}/reviews`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.ratingSummary.reviewCount).toBe(0);
    });

    it('should allow customer to delete their own review with 204 No Content', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(204);

      // Verify deletion
      const myReviews = await request(app.getHttpServer())
        .get('/api/v1/reviews/me')
        .set('Authorization', `Bearer ${customer1AccessToken}`)
        .expect(200);

      expect(myReviews.body.items).toHaveLength(0);
    });
  });
});
