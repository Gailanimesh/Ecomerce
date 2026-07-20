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
import { ProductMedia } from '../src/modules/catalog/entities/product-media.entity';
import { Inventory } from '../src/modules/inventory/entities/inventory.entity';
import { RoleEnum } from '../src/common/enums/roles.enum';
import { AdjustmentType } from '../src/modules/inventory/enums/adjustment-type.enum';

describe('Inventory Module (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let categoryRepository: Repository<Category>;
  let brandRepository: Repository<Brand>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let mediaRepository: Repository<ProductMedia>;
  let inventoryRepository: Repository<Inventory>;

  let adminAccessToken: string;
  let customerAccessToken: string;

  let testCategory: Category;
  let testBrand: Brand;
  let testProduct: Product;
  let testVariant1: ProductVariant;
  let testVariant2: ProductVariant;

  const adminCredentials = {
    email: 'admin_inventory@example.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
  };

  const customerCredentials = {
    email: 'customer_inventory@example.com',
    password: 'Password123!',
    firstName: 'Customer',
    lastName: 'User',
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
    mediaRepository = app.get<Repository<ProductMedia>>(getRepositoryToken(ProductMedia));
    inventoryRepository = app.get<Repository<Inventory>>(getRepositoryToken(Inventory));

    // Clean up inventory first due to FK constraints
    await inventoryRepository.createQueryBuilder().delete().execute();
    await mediaRepository.createQueryBuilder().delete().execute();
    await variantRepository.createQueryBuilder().delete().execute();
    await productRepository.createQueryBuilder().delete().execute();
    await categoryRepository.createQueryBuilder().delete().execute();
    await brandRepository.createQueryBuilder().delete().execute();

    // Clean users
    await userRepository.delete({ email: adminCredentials.email.toLowerCase() });
    await userRepository.delete({ email: customerCredentials.email.toLowerCase() });

    // Register customer
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customerCredentials)
      .expect(201);

    // Register admin
    const adminRegResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCredentials)
      .expect(201);

    const adminUserId = adminRegResponse.body.user.id;

    // Elevate admin
    const adminRole =
      (await roleRepository.findOne({ where: { name: RoleEnum.ADMIN } })) ||
      (await roleRepository.save(roleRepository.create({ name: RoleEnum.ADMIN })));

    await userRepository.update({ id: adminUserId }, { role: adminRole });

    // Login for tokens
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCredentials.email, password: adminCredentials.password })
      .expect(201);
    adminAccessToken = adminLoginRes.body.accessToken;

    const customerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerCredentials.email, password: customerCredentials.password })
      .expect(201);
    customerAccessToken = customerLoginRes.body.accessToken;

    // Setup Category, Brand, Product, and Variants
    testCategory = await categoryRepository.save(
      categoryRepository.create({ name: 'Footwear Inv', slug: 'footwear-inv' }),
    );

    testBrand = await brandRepository.save(
      brandRepository.create({ name: 'Nike Inv', slug: 'nike-inv' }),
    );

    testProduct = await productRepository.save(
      productRepository.create({
        name: 'Air Max Inv',
        slug: 'air-max-inv',
        brand: testBrand,
        category: testCategory,
      }),
    );

    testVariant1 = await variantRepository.save(
      variantRepository.create({
        sku: 'INV-SKU-001',
        slug: 'inv-sku-001',
        price: '100.00',
        product: testProduct,
      }),
    );

    testVariant2 = await variantRepository.save(
      variantRepository.create({
        sku: 'INV-SKU-002',
        slug: 'inv-sku-002',
        price: '120.00',
        product: testProduct,
      }),
    );
  });

  afterAll(async () => {
    await inventoryRepository.createQueryBuilder().delete().execute();
    await mediaRepository.createQueryBuilder().delete().execute();
    await variantRepository.createQueryBuilder().delete().execute();
    await productRepository.createQueryBuilder().delete().execute();
    await categoryRepository.createQueryBuilder().delete().execute();
    await brandRepository.createQueryBuilder().delete().execute();
    await userRepository.delete({ email: adminCredentials.email.toLowerCase() });
    await userRepository.delete({ email: customerCredentials.email.toLowerCase() });
    await app.close();
  });

  describe('RBAC & Security Constraints', () => {
    it('should deny unauthenticated requests to inventory endpoints', async () => {
      await request(app.getHttpServer()).get('/api/v1/inventory').expect(401);
    });

    it('should deny customer users from accessing inventory endpoints (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .expect(403);
    });
  });

  describe('Inventory Creation & Validation Rules', () => {
    it('should reject creation with non-existent productVariantId (404)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000000',
          availableQuantity: 50,
        })
        .expect(404);
    });

    it('should reject creation with negative availableQuantity (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          variantId: testVariant1.id,
          availableQuantity: -10,
        })
        .expect(400);
    });

    it('should allow Admin to create inventory record for variant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          variantId: testVariant1.id,
          availableQuantity: 50,
          lowStockThreshold: 10,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('productVariantId', testVariant1.id);
      expect(response.body).toHaveProperty('availableQuantity', 50);
      expect(response.body).toHaveProperty('reservedQuantity', 0);
      expect(response.body).toHaveProperty('lowStockThreshold', 10);
      expect(response.body).toHaveProperty('isAvailable', true);
      expect(response.body).toHaveProperty('isLowStock', false);
    });

    it('should prevent creating duplicate inventory for the same ProductVariant (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          variantId: testVariant1.id,
          availableQuantity: 20,
        })
        .expect(409);
    });
  });

  describe('Inventory Retrieval & List Filtering', () => {
    beforeAll(async () => {
      // Create inventory for variant 2 (low stock)
      await request(app.getHttpServer())
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          variantId: testVariant2.id,
          availableQuantity: 3,
          lowStockThreshold: 5,
        })
        .expect(201);
    });

    it('should get inventory by variantId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/inventory/${testVariant1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.productVariantId).toBe(testVariant1.id);
      expect(response.body.availableQuantity).toBe(50);
    });

    it('should return paginated inventory list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/inventory?page=1&limit=10')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter inventory list by low stock', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/inventory?lowStock=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].productVariantId).toBe(testVariant2.id);
      expect(response.body.items[0].isLowStock).toBe(true);
    });

    it('should filter inventory list by SKU', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/inventory?sku=INV-SKU-001')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].sku).toBe('INV-SKU-001');
    });
  });

  describe('Stock Adjustments (Increase & Decrease)', () => {
    it('should increase stock availableQuantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/adjust`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type: AdjustmentType.INCREASE,
          quantity: 20,
        })
        .expect(200);

      expect(response.body.availableQuantity).toBe(70);
    });

    it('should decrease stock availableQuantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/adjust`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type: AdjustmentType.DECREASE,
          quantity: 10,
        })
        .expect(200);

      expect(response.body.availableQuantity).toBe(60);
    });

    it('should reject decrease adjustment exceeding availableQuantity (prevent negative stock)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/adjust`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type: AdjustmentType.DECREASE,
          quantity: 100,
        })
        .expect(400);

      // Verify availableQuantity remains 60
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/v1/inventory/${testVariant1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(verifyRes.body.availableQuantity).toBe(60);
    });
  });

  describe('Reservation Lifecycle (Reserve -> Release -> Commit)', () => {
    it('should reserve stock quantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/reserve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ quantity: 15 })
        .expect(200);

      expect(response.body.availableQuantity).toBe(45); // 60 - 15
      expect(response.body.reservedQuantity).toBe(15);
    });

    it('should reject reserving more stock than available (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/reserve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ quantity: 100 })
        .expect(400);
    });

    it('should release portion of reserved stock back to available', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/release`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.availableQuantity).toBe(50); // 45 + 5
      expect(response.body.reservedQuantity).toBe(10); // 15 - 5
    });

    it('should reject releasing more than currently reserved (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/release`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ quantity: 50 })
        .expect(400);
    });

    it('should commit reserved stock upon order fulfillment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/commit`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ quantity: 10 })
        .expect(200);

      expect(response.body.availableQuantity).toBe(50);
      expect(response.body.reservedQuantity).toBe(0); // 10 - 10
    });
  });

  describe('Threshold Update & Out Of Stock Detection', () => {
    it('should update low stock threshold level', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/threshold`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ lowStockThreshold: 60 })
        .expect(200);

      expect(response.body.lowStockThreshold).toBe(60);
      expect(response.body.isLowStock).toBe(true); // available 50 <= threshold 60
    });

    it('should detect out of stock status', async () => {
      // Decrease stock to 0
      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/${testVariant1.id}/adjust`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ type: AdjustmentType.DECREASE, quantity: 50 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/inventory/${testVariant1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.availableQuantity).toBe(0);
      expect(response.body.isAvailable).toBe(false);

      // Filter outOfStock
      const filterRes = await request(app.getHttpServer())
        .get('/api/v1/inventory?outOfStock=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(filterRes.body.items.some((item: any) => item.productVariantId === testVariant1.id)).toBe(true);
    });
  });
});
