import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderHistory } from '../entities/order-history.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { Address } from '../../users/entities/address.entity';
import { OrderNumberService } from './order-number.service';
import { InventoryService } from '../../inventory/inventory.service';
import { OrderStatus } from '../enums/order-status.enum';
import { CartStatus } from '../../cart/enums/cart-status.enum';
import { ProductStatus } from '../../catalog/enum/productstaus.enum';
import { PaymentMethods } from '../../payments/enums/payment-method.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let dataSource: Partial<DataSource>;
  let inventoryService: Partial<InventoryService>;
  let orderNumberService: Partial<OrderNumberService>;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn((entityClass: any, plainObject: any) => plainObject as any),
    save: jest.fn(async (entityClassOrObj: any, obj?: any) => {
      const entity = obj || entityClassOrObj;
      if (entity && typeof entity === 'object' && !entity.id) entity.id = 'mock-generated-uuid';
      return entity;
    }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as EntityManager;

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(mockManager)),
    } as any;

    inventoryService = {
      reserveStock: jest.fn().mockResolvedValue({}),
      commitReservation: jest.fn().mockResolvedValue({}),
      releaseReservation: jest.fn().mockResolvedValue({}),
      increaseStock: jest.fn().mockResolvedValue({}),
    };

    orderNumberService = {
      generateOrderNumber: jest.fn().mockResolvedValue('ORD-20260801-102938'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(OrderItem), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(OrderHistory), useValue: { save: jest.fn() } },
        { provide: getRepositoryToken(Cart), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Address), useValue: { findOne: jest.fn() } },
        { provide: OrderNumberService, useValue: orderNumberService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    it('should throw BadRequestException if active cart is empty or does not exist', async () => {
      (mockManager.findOne as jest.Mock).mockResolvedValueOnce(null); // Cart is null

      await expect(
        service.checkout('user-1', { addressId: 'addr-1', paymentMethod: PaymentMethods.CARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if address does not belong to user', async () => {
      const mockCart = {
        id: 'cart-1',
        status: CartStatus.ACTIVE,
        cartItems: [
          {
            quantity: 1,
            productVariant: {
              id: 'var-1',
              price: '49.99',
              isActive: true,
              sku: 'SKU-01',
              product: { name: 'Item 1', status: ProductStatus.ACTIVE },
            },
          },
        ],
      };

      (mockManager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCart) // Cart query
        .mockResolvedValueOnce(null); // Address query

      await expect(
        service.checkout('user-1', { addressId: 'invalid-addr', paymentMethod: PaymentMethods.CARD }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is not ACTIVE', async () => {
      const mockCart = {
        id: 'cart-1',
        status: CartStatus.ACTIVE,
        cartItems: [
          {
            quantity: 1,
            productVariant: {
              id: 'var-1',
              price: '49.99',
              isActive: true,
              sku: 'SKU-01',
              product: { name: 'Inactive Item', status: ProductStatus.DRAFT },
            },
          },
        ],
      };

      const mockAddress = {
        id: 'addr-1',
        street1: '123 Main St',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '12345',
        user: { fullName: 'Jane Doe' },
      };

      (mockManager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(mockAddress);

      await expect(
        service.checkout('user-1', { addressId: 'addr-1', paymentMethod: PaymentMethods.CARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully place order, reserve inventory, log history, and clear cart', async () => {
      const mockCart = {
        id: 'cart-1',
        status: CartStatus.ACTIVE,
        cartItems: [
          {
            quantity: 2,
            productVariant: {
              id: 'var-1',
              price: '25.00',
              isActive: true,
              sku: 'SKU-01',
              color: 'Black',
              product: {
                name: 'Pro Controller',
                slug: 'pro-controller',
                status: ProductStatus.ACTIVE,
                brand: { name: 'TechBrand' },
                category: { name: 'Gaming' },
                media: [{ url: 'http://img.png' }],
              },
            },
          },
        ],
      };

      const mockAddress = {
        id: 'addr-1',
        street1: '123 Main St',
        street2: 'Apt 4B',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        user: { fullName: 'John Customer' },
      };

      (mockManager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(mockAddress);

      const result = await service.checkout('user-1', {
        addressId: 'addr-1',
        paymentMethod: PaymentMethods.CARD,
        notes: 'Handle with care',
      });

      expect(result).toBeDefined();
      expect(result.order).toBeDefined();
      expect(result.order.orderNumber).toBe('ORD-20260801-102938');
      expect(result.order.subtotal).toBe(50.0);
      expect(result.order.grandTotal).toBe(50.0);
      expect(result.nextAction.paymentRequired).toBe(true);
      expect(result.nextAction.paymentMethod).toBe(PaymentMethods.CARD);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith('var-1', 2, mockManager);
      expect(mockManager.delete).toHaveBeenCalledWith(CartItem, { cart: { id: 'cart-1' } });
    });
  });

  describe('cancelOwnOrder', () => {
    it('should allow customer to cancel order in PENDING_PAYMENT status', async () => {
      const orderRepo = service['orderRepository'];
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING_PAYMENT,
        user: { id: 'user-1' },
      };
      (orderRepo.findOne as jest.Mock).mockResolvedValue(mockOrder);

      (mockManager.findOne as jest.Mock).mockResolvedValue({
        ...mockOrder,
        orderItems: [],
        history: [],
      });

      const updated = await service.cancelOwnOrder('user-1', 'order-1');
      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
