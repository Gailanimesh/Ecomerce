import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OrderNumberService } from './order-number.service';

describe('OrderNumberService', () => {
  let service: OrderNumberService;
  let findOneMock: jest.Mock;

  beforeEach(async () => {
    findOneMock = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderNumberService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: findOneMock,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrderNumberService>(OrderNumberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an order number with prefix ORD- and format YYYYMMDD', async () => {
    const orderNumber = await service.generateOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
  });

  it('should retry generation if a collision occurs', async () => {
    // First call collides, second call succeeds
    findOneMock
      .mockResolvedValueOnce({ id: 'existing-order-id' })
      .mockResolvedValueOnce(null);

    const orderNumber = await service.generateOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    expect(findOneMock).toHaveBeenCalledTimes(2);
  });
});
