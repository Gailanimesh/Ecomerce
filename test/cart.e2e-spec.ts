import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Brand } from '../src/modules/catalog/entities/brand.entity';
import { Product } from '../src/modules/catalog/entities/product.entity';
import { ProductVariant } from '../src/modules/catalog/entities/product-variant.entity';
import { Inventory } from '../src/modules/inventory/entities/inventory.entity';
import { Cart } from '../src/modules/cart/entities/cart.entity';
import { CartItem } from '../src/modules/cart/entities/cart-item.entity';
import { ProductStatus } from '../src/modules/catalog/enum/productstaus.enum';
import { CartStatus } from '../src/modules/cart/enums/cart-status.enum';

describe('Cart Module (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<Category>;
  let brandRepository: Repository<Brand>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let inventoryRepository: Repository<Inventory>;
  let cartRepository: Repository<Cart>;
  let cartItemRepository: Repository<CartItem>;

  let customer1Token: string;
  let customer2Token: string;

  let activeProduct: Product;
  let draftProduct: Product;

  let activeVariant1: ProductVariant;
  let activeVariant2: ProductVariant;
  let draftVariant: ProductVariant;

  let inventory1: Inventory;

  const customer1Credentials = {
    email: 'cart_customer1@example.com',
    password: 'Password123!',
    firstName: 'Customer',
    lastName: 'One',
  };

  const customer2Credentials = {
    email: 'cart_customer2@example.com',
    password: 'Password123!',
    firstName: 'Customer',
    lastName: 'Two',
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
    categoryRepository = app.get<Repository<Category>>(getRepositoryToken(Category));
    brandRepository = app.get<Repository<Brand>>(getRepositoryToken(Brand));
    productRepository = app.get<Repository<Product>>(getRepositoryToken(Product));
    variantRepository = app.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    inventoryRepository = app.get<Repository<Inventory>>(getRepositoryToken(Inventory));
    cartRepository = app.get<Repository<Cart>>(getRepositoryToken(Cart));
    cartItemRepository = app.get<Repository<CartItem>>(getRepositoryToken(CartItem));

    const dataSource = app.get(DataSource);
    await dataSource.query('DROP TABLE IF EXISTS cart_items CASCADE;');
    await dataSource.query('DROP TABLE IF EXISTS carts CASCADE;');
    await dataSource.query('DROP TYPE IF EXISTS carts_status_enum CASCADE;');
    await dataSource.synchronize();

    // Cleanup existing cart items and carts first
    await cartItemRepository.createQueryBuilder().delete().execute();
    await cartRepository.createQueryBuilder().delete().execute();
    await inventoryRepository.createQueryBuilder().delete().execute();
    await variantRepository.createQueryBuilder().delete().execute();
    await productRepository.createQueryBuilder().delete().execute();
    await categoryRepository.createQueryBuilder().delete().execute();
    await brandRepository.createQueryBuilder().delete().execute();

    await userRepository.delete({ email: customer1Credentials.email.toLowerCase() });
    await userRepository.delete({ email: customer2Credentials.email.toLowerCase() });

    // Register customer 1
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer1Credentials)
      .expect(201);

    const login1Res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: customer1Credentials.email,
        password: customer1Credentials.password,
      })
      .expect(201);

    customer1Token = login1Res.body.accessToken;

    // Register customer 2
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customer2Credentials)
      .expect(201);

    const login2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: customer2Credentials.email,
        password: customer2Credentials.password,
      })
      .expect(201);

    customer2Token = login2Res.body.accessToken;

    // Seed test category and brand
    const category = await categoryRepository.save(
      categoryRepository.create({
        name: 'Apparel',
        slug: 'apparel-cart-e2e',
      }),
    );

    const brand = await brandRepository.save(
      brandRepository.create({
        name: 'Nike',
        slug: 'nike-cart-e2e',
      }),
    );

    // Active product with variants
    activeProduct = await productRepository.save(
      productRepository.create({
        name: 'Nike Air Max',
        slug: 'nike-air-max-cart-e2e',
        status: ProductStatus.ACTIVE,
        category,
        brand,
      }),
    );

    activeVariant1 = await variantRepository.save(
      variantRepository.create({
        sku: 'NIKE-AIR-42-BLK',
        slug: 'nike-air-42-blk-e2e',
        price: '120.00',
        isActive: true,
        product: activeProduct,
      }),
    );

    activeVariant2 = await variantRepository.save(
      variantRepository.create({
        sku: 'NIKE-AIR-43-WHT',
        slug: 'nike-air-43-wht-e2e',
        price: '130.00',
        isActive: true,
        product: activeProduct,
      }),
    );

    inventory1 = await inventoryRepository.save(
      inventoryRepository.create({
        productVariantId: activeVariant1.id,
        availableQuantity: 10,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        variant: activeVariant1,
      }),
    );

    await inventoryRepository.save(
      inventoryRepository.create({
        productVariantId: activeVariant2.id,
        availableQuantity: 5,
        reservedQuantity: 0,
        lowStockThreshold: 2,
        variant: activeVariant2,
      }),
    );

    // Draft product
    draftProduct = await productRepository.save(
      productRepository.create({
        name: 'Nike Prototype Shoe',
        slug: 'nike-prototype-e2e',
        status: ProductStatus.DRAFT,
        category,
        brand,
      }),
    );

    draftVariant = await variantRepository.save(
      variantRepository.create({
        sku: 'NIKE-PROTO-01',
        slug: 'nike-proto-01-e2e',
        price: '200.00',
        isActive: true,
        product: draftProduct,
      }),
    );

    await inventoryRepository.save(
      inventoryRepository.create({
        productVariantId: draftVariant.id,
        availableQuantity: 10,
        reservedQuantity: 0,
        lowStockThreshold: 2,
        variant: draftVariant,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/cart', () => {
    it('should fail with 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    });

    it('should create and return active cart for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(CartStatus.ACTIVE);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items).toHaveLength(0);
      expect(response.body.summary).toEqual({
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
      });
      expect(response.body.validation).toEqual({
        isValid: true,
        warnings: [],
      });
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('should add item to active cart and lock price snapshot', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 2,
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      const item = response.body.items[0];
      expect(item.variantId).toBe(activeVariant1.id);
      expect(item.productName).toBe('Nike Air Max');
      expect(item.quantity).toBe(2);
      expect(item.unitPriceSnapshot).toBe(120.0);
      expect(item.subtotal).toBe(240.0);
      expect(response.body.summary).toEqual({
        totalItems: 1,
        totalQuantity: 2,
        subtotal: 240.0,
      });
    });

    it('should increase quantity when adding same variant again', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 1,
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(3);
      expect(response.body.summary).toEqual({
        totalItems: 1,
        totalQuantity: 3,
        subtotal: 360.0,
      });
    });

    it('should reject adding item with quantity less than 1', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 0,
        })
        .expect(400);
    });

    it('should reject adding draft or inactive product to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: draftVariant.id,
          quantity: 1,
        })
        .expect(400);

      expect(response.body.message).toContain('Product is no longer active.');
    });

    it('should reject adding quantity exceeding available inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 100,
        })
        .expect(400);

      expect(response.body.message).toContain(
        'Requested quantity exceeds available inventory.',
      );
    });

    it('should reject non-existent variant ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
          quantity: 1,
        })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/cart/items/:itemId', () => {
    let itemId: string;

    beforeEach(async () => {
      // Clear cart and add variant1
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customer1Token}`);

      const addRes = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 2,
        })
        .expect(201);

      itemId = addRes.body.items[0].id;
    });

    it('should update item quantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(5);
      expect(response.body.summary.subtotal).toBe(600.0);
    });

    it('should remove item when quantity is updated to 0', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ quantity: 0 })
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.summary.totalQuantity).toBe(0);
    });

    it('should forbid updating another user cart item', async () => {
      // Customer 2 attempts to update customer 1 item
      await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ quantity: 4 })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/cart/items/:itemId', () => {
    it('should delete specified item from cart', async () => {
      const addRes = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          productVariantId: activeVariant1.id,
          quantity: 2,
        })
        .expect(201);

      const itemId = addRes.body.items[0].id;

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('should clear all items in active cart', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ productVariantId: activeVariant1.id, quantity: 2 });

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ productVariantId: activeVariant2.id, quantity: 1 });

      const clearRes = await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(clearRes.body.items).toHaveLength(0);
      expect(clearRes.body.summary.totalQuantity).toBe(0);
    });
  });

  describe('Cart Validation & Warnings', () => {
    it('should report warnings if inventory drops below item quantity', async () => {
      // Clear cart
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customer1Token}`);

      // Add 4 items of variant 2 (available: 5)
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ productVariantId: activeVariant2.id, quantity: 4 })
        .expect(201);

      // Reduce inventory to 2 directly in DB
      const inv2 = await inventoryRepository.findOneByOrFail({
        variant: { id: activeVariant2.id },
      });
      inv2.availableQuantity = 2;
      await inventoryRepository.save(inv2);

      // GET /cart should show warning and isValid: false
      const getRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(getRes.body.validation.isValid).toBe(false);
      expect(getRes.body.validation.warnings).toContain(
        "Only 2 items remain in stock for 'Nike Air Max'.",
      );
    });
  });

  describe('GET /api/v1/cart/checkout-prep', () => {
    it('should return checkout preparation contract object', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart/checkout-prep')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('checkoutAllowed');
      expect(response.body).toHaveProperty('cartSummary');
      expect(response.body).toHaveProperty('validation');
      expect(response.body).toHaveProperty('items');
    });
  });
});
