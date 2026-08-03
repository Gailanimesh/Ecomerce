import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './services/orders.service';
import { PaymentMethods } from '../payments/enums/payment-method.enum';
import { OrderStatus } from './enums/order-status.enum';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: Partial<OrdersService>;

  beforeEach(async () => {
    service = {
      checkout: jest.fn().mockResolvedValue({
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-20260801-102938',
          status: OrderStatus.PENDING_PAYMENT,
          grandTotal: 99.99,
        },
        nextAction: { paymentRequired: true, paymentMethod: PaymentMethods.CARD },
      }),
      getUserOrders: jest.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }),
      getUserOrderById: jest.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-20260801-102938' }),
      cancelOwnOrder: jest.fn().mockResolvedValue({ id: 'ord-1', status: OrderStatus.CANCELLED }),
      getAllOrders: jest.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }),
      getAdminOrderById: jest.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-20260801-102938' }),
      updateOrderStatus: jest.fn().mockResolvedValue({ id: 'ord-1', status: OrderStatus.CONFIRMED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: service },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call checkout on service', async () => {
    const user = { id: 'user-1', email: 'test@example.com', role: 'customer' } as any;
    const dto = { addressId: 'addr-1', paymentMethod: PaymentMethods.CARD };
    const res = await controller.checkout(user, dto);
    expect(service.checkout).toHaveBeenCalledWith('user-1', dto);
    expect(res.nextAction.paymentRequired).toBe(true);
  });

  it('should call getUserOrders on service', async () => {
    const user = { id: 'user-1' } as any;
    await controller.getUserOrders(user, {});
    expect(service.getUserOrders).toHaveBeenCalledWith('user-1', {});
  });
});
