import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Address } from '../entities/address.entity';
import { User } from '../entities/user.entity';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { AddressResponseDto } from '../dto/address-response.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new address for the authenticated user inside a single transaction.
   * If this is the user's first address or isDefault is true, marks it as default and unmarks others.
   */
  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const existingCount = await manager.count(Address, {
        where: { user: { id: userId } },
      });

      const shouldBeDefault = existingCount === 0 || dto.isDefault === true;

      if (shouldBeDefault && existingCount > 0) {
        await manager.update(
          Address,
          { user: { id: userId } },
          { isDefault: false },
        );
      }

      const address = manager.create(Address, {
        street1: dto.street1,
        street2: dto.street2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        isDefault: shouldBeDefault,
        user: { id: userId } as User,
      });

      const saved = await manager.save(Address, address);
      return this.mapToResponseDto(saved);
    });
  }

  /**
   * Retrieves all saved addresses for the authenticated user, ordered by default state.
   */
  async findAllByUser(userId: string): Promise<AddressResponseDto[]> {
    const addresses = await this.addressRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return addresses.map((a) => this.mapToResponseDto(a));
  }

  /**
   * Retrieves a single address owned by the authenticated user.
   */
  async findOneByUser(
    userId: string,
    addressId: string,
  ): Promise<AddressResponseDto> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user: { id: userId } },
    });

    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    return this.mapToResponseDto(address);
  }

  /**
   * Updates an existing address owned by the user inside a transaction.
   * Enforces Default Invariant: updating current default with isDefault: false without another default maintains default state.
   */
  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(Address, {
        where: { id: addressId, user: { id: userId } },
      });

      if (!address) {
        throw new NotFoundException('Address not found.');
      }

      if (dto.isDefault === true) {
        await manager.update(
          Address,
          { user: { id: userId } },
          { isDefault: false },
        );
        address.isDefault = true;
      } else if (dto.isDefault === false && address.isDefault) {
        // Default Invariant: preserve default if no other default exists
        address.isDefault = true;
      }

      if (dto.street1 !== undefined) address.street1 = dto.street1;
      if (dto.street2 !== undefined) address.street2 = dto.street2;
      if (dto.city !== undefined) address.city = dto.city;
      if (dto.state !== undefined) address.state = dto.state;
      if (dto.country !== undefined) address.country = dto.country;
      if (dto.postalCode !== undefined) address.postalCode = dto.postalCode;

      const updated = await manager.save(Address, address);
      return this.mapToResponseDto(updated);
    });
  }

  /**
   * Sets a specific address as the user's default inside a single transaction.
   */
  async setDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(Address, {
        where: { id: addressId, user: { id: userId } },
      });

      if (!address) {
        throw new NotFoundException('Address not found.');
      }

      await manager.update(
        Address,
        { user: { id: userId } },
        { isDefault: false },
      );

      address.isDefault = true;
      const updated = await manager.save(Address, address);
      return this.mapToResponseDto(updated);
    });
  }

  /**
   * Deletes an address owned by the user inside a transaction.
   * If the deleted address was default, automatically promotes the most recently created remaining address.
   */
  async remove(
    userId: string,
    addressId: string,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(Address, {
        where: { id: addressId, user: { id: userId } },
      });

      if (!address) {
        throw new NotFoundException('Address not found.');
      }

      const wasDefault = address.isDefault;
      await manager.remove(Address, address);

      if (wasDefault) {
        const remaining = await manager.findOne(Address, {
          where: { user: { id: userId } },
          order: { createdAt: 'DESC' },
        });

        if (remaining) {
          remaining.isDefault = true;
          await manager.save(Address, remaining);
        }
      }

      return { message: 'Address deleted successfully.' };
    });
  }

  private mapToResponseDto(address: Address): AddressResponseDto {
    return {
      id: address.id,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
