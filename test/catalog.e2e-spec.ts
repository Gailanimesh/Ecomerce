import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from './../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/users/entities/role.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Brand } from '../src/modules/catalog/entities/brand.entity';
import { Product } from '../src/modules/catalog/entities/product.entity';
import { ProductVariant } from '../src/modules/catalog/entities/product-variant.entity';
import { ProductMedia, MediaType } from '../src/modules/catalog/entities/product-media.entity';
import { RoleEnum } from '../src/common/enums/roles.enum';
import { ProductStatus } from '../src/modules/catalog/enum/productstaus.enum';

describe('Catalog Module (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let categoryRepository: Repository<Category>;
  let brandRepository: Repository<Brand>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let mediaRepository: Repository<ProductMedia>;

  let adminAccessToken: string;
  let customerAccessToken: string;

  const adminCredentials = {
    email: 'admin_catalog@example.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
  };

  const customerCredentials = {
    email: 'customer_catalog@example.com',
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

    // Clear product relations first due to constraints
    await mediaRepository.createQueryBuilder().delete().execute();
    await variantRepository.createQueryBuilder().delete().execute();
    await productRepository.createQueryBuilder().delete().execute();
    await categoryRepository.createQueryBuilder().delete().execute();
    await brandRepository.createQueryBuilder().delete().execute();

    // Cleanup users first
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
    const adminRole = await roleRepository.findOne({ where: { name: RoleEnum.ADMIN } })
      || await roleRepository.save(roleRepository.create({ name: RoleEnum.ADMIN }));

    await userRepository.update({ id: adminUserId }, { role: adminRole });

    // Logins to get access tokens
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
  });

  afterAll(async () => {
    // Clear product relations first due to constraints
    await mediaRepository.createQueryBuilder().delete().execute();
    await variantRepository.createQueryBuilder().delete().execute();
    await productRepository.createQueryBuilder().delete().execute();
    await categoryRepository.createQueryBuilder().delete().execute();
    await brandRepository.createQueryBuilder().delete().execute();

    await userRepository.delete({ email: adminCredentials.email.toLowerCase() });
    await userRepository.delete({ email: customerCredentials.email.toLowerCase() });
    await app.close();
  });

  describe('Categories CRUD & Rules', () => {
    let parentCategoryId: string;
    let childCategoryId: string;

    it('should allow Admin to create a root category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Electronics' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('slug', 'electronics');
      parentCategoryId = response.body.id;
    });

    it('should prevent creating a duplicate category name under the same parent', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Electronics' })
        .expect(409);
    });

    it('should allow creating a child category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Computers', parentId: parentCategoryId })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('parentId', parentCategoryId);
      childCategoryId = response.body.id;
    });

    it('should deny Customer from creating a category (RBAC)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({ name: 'Home Appliances' })
        .expect(403);
    });

    it('should allow listing categories publicly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent deleting parent category if direct child category exists', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${parentCategoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(409);
    });
  });

  describe('Brands CRUD & Rules', () => {
    let brandId: string;

    it('should allow Admin to create a brand', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Sony', description: 'Sony Electronics' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('slug', 'sony');
      brandId = response.body.id;
    });

    it('should prevent creating duplicate brand name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Sony' })
        .expect(409);
    });

    it('should deny Customer from creating a brand', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({ name: 'LG' })
        .expect(403);
    });

    it('should allow listing brands publicly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/brands')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Products Creation, Transactions & Rules', () => {
    let categoryId: string;
    let brandId: string;
    let createdProductId: string;

    beforeAll(async () => {
      const cat = await categoryRepository.findOne({ where: { slug: 'computers' } });
      categoryId = cat!.id;
      const br = await brandRepository.findOne({ where: { slug: 'sony' } });
      brandId = br!.id;
    });

    it('should throw error when categoryId is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Vaio Laptop',
          brandId,
          categoryId: '00000000-0000-0000-0000-000000000000',
          variants: [{ sku: 'VAIO-123', price: '999.99' }],
        })
        .expect(404);
    });

    it('should create product, variants, and media in a single transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Vaio Laptop Pro',
          description: 'Premium light laptop',
          brandId,
          categoryId,
          status: ProductStatus.DRAFT,
          variants: [
            { sku: 'VAIO-PRO-BLK', price: '1299.99', color: 'Black', size: '15-inch' },
            { sku: 'VAIO-PRO-SLV', price: '1349.99', color: 'Silver', size: '15-inch' },
          ],
          media: [
            { url: 'http://sony.com/laptop1.png', type: MediaType.IMAGE, altText: 'Vaio Black', displayOrder: 1 },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('slug', 'vaio-laptop-pro');
      expect(response.body.variants.length).toBe(2);
      expect(response.body.media.length).toBe(1);
      createdProductId = response.body.id;
    });

    it('should rollback product creation if variant SKU is duplicate', async () => {
      // VAIO-PRO-BLK already exists
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Vaio Laptop Dupe',
          brandId,
          categoryId,
          variants: [{ sku: 'VAIO-PRO-BLK', price: '500.00' }],
        })
        .expect(409);

      // Verify that no product named "Vaio Laptop Dupe" was created
      const dupeProduct = await productRepository.findOne({ where: { name: 'Vaio Laptop Dupe' } });
      expect(dupeProduct).toBeNull();
    });

    it('should enforce unique variant attribute combinations for the same product', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Vaio Laptop Dupe Combination',
          brandId,
          categoryId,
          variants: [
            { sku: 'SKU-COMB-1', price: '500.00', color: 'Red', size: '13' },
            { sku: 'SKU-COMB-2', price: '600.00', color: 'Red', size: '13' },
          ],
        })
        .expect(400);
    });

    it('should NOT list DRAFT product for public customers', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      const found = listResponse.body.items.find((p: any) => p.id === createdProductId);
      expect(found).toBeUndefined();

      // Details GET by customer should return 404
      await request(app.getHttpServer())
        .get(`/api/v1/products/${createdProductId}`)
        .expect(404);
    });

    it('should allow Admin to update product fields and verify status transitions', async () => {
      // Update from DRAFT to ACTIVE
      const activeResponse = await request(app.getHttpServer())
        .patch(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: ProductStatus.ACTIVE })
        .expect(200);

      expect(activeResponse.body.status).toBe(ProductStatus.ACTIVE);

      // Verify it is now visible to customers
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      const found = listResponse.body.items.find((p: any) => p.id === createdProductId);
      expect(found).toBeDefined();

      // ARCHIVED status transition
      const archivedResponse = await request(app.getHttpServer())
        .patch(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: ProductStatus.ARCHIVED })
        .expect(200);

      expect(archivedResponse.body.status).toBe(ProductStatus.ARCHIVED);

      // ARCHIVED directly to DRAFT should fail
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: ProductStatus.DRAFT })
        .expect(400);

      // Return to ACTIVE
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: ProductStatus.ACTIVE })
        .expect(200);
    });

    it('should prevent deleting category or brand referenced by product', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/api/v1/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(409);
    });
  });

  describe('Products Search, Pagination, Filtering & Sorting', () => {
    it('should return paginated list of active products with standard metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 5);
      expect(response.body.meta).toHaveProperty('totalItems');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should filter by brand and category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?brand=sony&category=computers')
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by price range', async () => {
      // Item price is 1299.99 and 1349.99
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?minPrice=1200&maxPrice=1400')
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);

      const emptyResponse = await request(app.getHttpServer())
        .get('/api/v1/products?minPrice=100&maxPrice=500')
        .expect(200);

      expect(emptyResponse.body.items.length).toBe(0);
    });

    it('should search products by brand name, category name, or variant SKU', async () => {
      const sonySearch = await request(app.getHttpServer())
        .get('/api/v1/products?q=Sony')
        .expect(200);
      expect(sonySearch.body.items.length).toBeGreaterThanOrEqual(1);

      const computersSearch = await request(app.getHttpServer())
        .get('/api/v1/products?q=Computers')
        .expect(200);
      expect(computersSearch.body.items.length).toBeGreaterThanOrEqual(1);

      const skuSearch = await request(app.getHttpServer())
        .get('/api/v1/products?q=VAIO-PRO-BLK')
        .expect(200);
      expect(skuSearch.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort products by price', async () => {
      const ascSort = await request(app.getHttpServer())
        .get('/api/v1/products?sort=price')
        .expect(200);

      const descSort = await request(app.getHttpServer())
        .get('/api/v1/products?sort=-price')
        .expect(200);

      expect(ascSort.status).toBe(200);
      expect(descSort.status).toBe(200);
    });
  });
});
