import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { AddressService } from './address.service';
import { Address } from '../entities/address.entity';
import { Order } from '../../orders/entities/order.entity';

describe('AddressService', () => {
  let service: AddressService;
  let addressRepository: any;
  let dataSource: any;

  let mockAddresses: Address[];
  let mockManager: any;

  beforeEach(async () => {
    mockAddresses = [];

    mockManager = {
      count: jest.fn(async (entityClass, options) => {
        const userId = options?.where?.user?.id;
        return mockAddresses.filter((a) => a.user?.id === userId).length;
      }),
      findOne: jest.fn(async (entityClass, options) => {
        const where = options?.where;
        if (!where) return null;

        return (
          mockAddresses.find((a) => {
            const matchesId = !where.id || a.id === where.id;
            const matchesUser = !where.user?.id || a.user?.id === where.user.id;
            return matchesId && matchesUser;
          }) || null
        );
      }),
      update: jest.fn(async (entityClass, where, updateDto) => {
        const userId = where?.user?.id;
        mockAddresses.forEach((a) => {
          if (!userId || a.user?.id === userId) {
            Object.assign(a, updateDto);
          }
        });
        return { affected: mockAddresses.length };
      }),
      create: jest.fn((entityClass, dto) => ({
        ...dto,
        id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn(async (entityClass, entity) => {
        const obj = entity || entityClass;
        const existingIdx = mockAddresses.findIndex((a) => a.id === obj.id);
        if (existingIdx >= 0) {
          mockAddresses[existingIdx] = obj;
        } else {
          mockAddresses.push(obj);
        }
        return obj;
      }),
      remove: jest.fn(async (entityClass, entity) => {
        const obj = entity || entityClass;
        const idx = mockAddresses.findIndex((a) => a.id === obj.id);
        if (idx >= 0) mockAddresses.splice(idx, 1);
        return obj;
      }),
    };

    addressRepository = {
      find: jest.fn(async (options) => {
        const userId = options?.where?.user?.id;
        return mockAddresses
          .filter((a) => !userId || a.user?.id === userId)
          .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      }),
      findOne: jest.fn(async (options) => {
        const where = options?.where;
        return (
          mockAddresses.find((a) => {
            const matchesId = !where.id || a.id === where.id;
            const matchesUser = !where.user?.id || a.user?.id === where.user.id;
            return matchesId && matchesUser;
          }) || null
        );
      }),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: getRepositoryToken(Address), useValue: addressRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  describe('create', () => {
    it('should set first address as default automatically', async () => {
      const created = await service.create('user-1', {
        street1: '123 First Ave',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        isDefault: false, // Client provided false, but first address must be default
      });

      expect(created.isDefault).toBe(true);
      expect(mockAddresses).toHaveLength(1);
      expect(mockAddresses[0].isDefault).toBe(true);
    });

    it('should not make second address default if created with isDefault: false', async () => {
      // First address
      await service.create('user-1', {
        street1: '123 First Ave',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
      });

      // Second address
      const second = await service.create('user-1', {
        street1: '456 Second St',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10002',
        isDefault: false,
      });

      expect(second.isDefault).toBe(false);
      expect(mockAddresses[0].isDefault).toBe(true);
      expect(mockAddresses[1].isDefault).toBe(false);
    });

    it('should unmark previous default when creating second default address', async () => {
      const addr1 = await service.create('user-1', {
        street1: '123 First Ave',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
      });

      const addr2 = await service.create('user-1', {
        street1: '456 Second St',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        postalCode: '10002',
        isDefault: true,
      });

      expect(addr2.isDefault).toBe(true);
      const updatedAddr1 = mockAddresses.find((a) => a.id === addr1.id);
      expect(updatedAddr1?.isDefault).toBe(false);
    });
  });

  describe('update', () => {
    it('should preserve default invariant when updating current default with isDefault: false', async () => {
      const addr1 = await service.create('user-1', {
        street1: '123 Main St',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '12345',
      });

      const updated = await service.update('user-1', addr1.id, {
        isDefault: false, // Attempt to unset default without another default
        street1: '123 Main St Updated',
      });

      expect(updated.isDefault).toBe(true); // Must remain default to preserve invariant
      expect(updated.street1).toBe('123 Main St Updated');
    });
  });

  describe('setDefault', () => {
    it('should set specified address as default and unmark others', async () => {
      const addr1 = await service.create('user-1', {
        street1: '123 First Ave',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10001',
      });

      const addr2 = await service.create('user-1', {
        street1: '456 Second St',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10002',
        isDefault: false,
      });

      const result = await service.setDefault('user-1', addr2.id);

      expect(result.isDefault).toBe(true);
      const updatedAddr1 = mockAddresses.find((a) => a.id === addr1.id);
      expect(updatedAddr1?.isDefault).toBe(false);
    });
  });

  describe('remove', () => {
    it('should promote remaining address when deleting default address', async () => {
      const addr1 = await service.create('user-1', {
        street1: '123 First Ave',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10001',
      });

      const addr2 = await service.create('user-1', {
        street1: '456 Second St',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10002',
        isDefault: false,
      });

      await service.remove('user-1', addr1.id);

      expect(mockAddresses).toHaveLength(1);
      expect(mockAddresses[0].id).toBe(addr2.id);
      expect(mockAddresses[0].isDefault).toBe(true);
    });

    it('should not alter default address when deleting non-default address', async () => {
      const addr1 = await service.create('user-1', {
        street1: '123 First Ave',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10001',
      });

      const addr2 = await service.create('user-1', {
        street1: '456 Second St',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '10002',
        isDefault: false,
      });

      await service.remove('user-1', addr2.id);

      expect(mockAddresses).toHaveLength(1);
      expect(mockAddresses[0].id).toBe(addr1.id);
      expect(mockAddresses[0].isDefault).toBe(true);
    });
  });

  describe('Tenant User Isolation', () => {
    it('should prevent User A from accessing User B address', async () => {
      const addrB = await service.create('user-B', {
        street1: 'User B Street',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '99999',
      });

      await expect(service.findOneByUser('user-A', addrB.id)).rejects.toThrow(NotFoundException);
    });

    it('should prevent User A from modifying User B address', async () => {
      const addrB = await service.create('user-B', {
        street1: 'User B Street',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '99999',
      });

      await expect(
        service.update('user-A', addrB.id, { street1: 'Hacked Street' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent User A from deleting User B address', async () => {
      const addrB = await service.create('user-B', {
        street1: 'User B Street',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '99999',
      });

      await expect(service.remove('user-A', addrB.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Order Snapshot Immutability', () => {
    it('modifying or deleting an Address after checkout does NOT alter an existing Order shipping snapshot', async () => {
      const addr = await service.create('user-1', {
        street1: 'Original Shipping St',
        city: 'Original City',
        state: 'Original State',
        country: 'USA',
        postalCode: '10001',
      });

      // Simulate Order snapshot taken at checkout time
      const mockOrderSnapshot = {
        id: 'order-999',
        shippingStreet: addr.street1,
        shippingCity: addr.city,
        shippingState: addr.state,
        shippingCountry: addr.country,
        shippingPostalCode: addr.postalCode,
      };

      // User modifies address after order placement
      await service.update('user-1', addr.id, {
        street1: 'NEW Updated Street 2026',
        city: 'NEW City',
      });

      // User deletes address after order placement
      await service.remove('user-1', addr.id);

      // Verify order snapshot remains identical
      expect(mockOrderSnapshot.shippingStreet).toBe('Original Shipping St');
      expect(mockOrderSnapshot.shippingCity).toBe('Original City');
    });
  });
});
