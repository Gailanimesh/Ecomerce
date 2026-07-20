import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Inventory } from './entities/inventory.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustmentType } from './enums/adjustment-type.enum';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  InventoryResponseDto,
  PaginatedInventoryResponseDto,
} from './dto/inventory-response.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  async createInventory(
    dto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const variant = await manager.findOne(ProductVariant, {
        where: { id: dto.variantId },
      });
      if (!variant) {
        throw new NotFoundException('ProductVariant not found');
      }

      const existing = await manager.findOne(Inventory, {
        where: { variant: { id: dto.variantId } },
      });
      if (existing) {
        throw new ConflictException(
          'Inventory already exists for this ProductVariant',
        );
      }

      if (dto.availableQuantity < 0) {
        throw new BadRequestException('Available quantity cannot be negative');
      }

      const reservedQuantity = dto.reservedQuantity ?? 0;
      if (reservedQuantity < 0) {
        throw new BadRequestException('Reserved quantity cannot be negative');
      }

      const lowStockThreshold = dto.lowStockThreshold ?? 5;
      if (lowStockThreshold < 0) {
        throw new BadRequestException('Low stock threshold cannot be negative');
      }

      const inventory = manager.create(Inventory, {
        productVariantId: dto.variantId,
        availableQuantity: dto.availableQuantity,
        reservedQuantity,
        lowStockThreshold,
        variant,
      });

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async getInventoryById(id: string): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: { variant: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return this.mapToResponseDto(inventory);
  }

  async getInventoryByVariantId(
    variantId: string,
  ): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { variant: { id: variantId } },
      relations: { variant: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found for variant');
    }

    return this.mapToResponseDto(inventory);
  }

  async getInventoryList(
    query: InventoryQueryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant');

    if (query.sku) {
      queryBuilder.andWhere('variant.sku ILIKE :sku', {
        sku: `%${query.sku}%`,
      });
    }

    if (query.lowStock) {
      queryBuilder.andWhere(
        'inventory.availableQuantity <= inventory.lowStockThreshold',
      );
    }

    if (query.outOfStock) {
      queryBuilder.andWhere('inventory.availableQuantity = 0');
    }

    // Sort
    if (query.sort) {
      const isDesc = query.sort.startsWith('-');
      const fieldName = isDesc ? query.sort.substring(1) : query.sort;

      if (fieldName === 'sku') {
        queryBuilder.orderBy('variant.sku', isDesc ? 'DESC' : 'ASC');
      } else if (fieldName === 'availableQuantity') {
        queryBuilder.orderBy(
          'inventory.availableQuantity',
          isDesc ? 'DESC' : 'ASC',
        );
      } else if (fieldName === 'updatedAt') {
        queryBuilder.orderBy('inventory.updatedAt', isDesc ? 'DESC' : 'ASC');
      } else {
        queryBuilder.orderBy('inventory.createdAt', 'DESC');
      }
    } else {
      queryBuilder.orderBy('inventory.createdAt', 'DESC');
    }

    queryBuilder.skip(skip).take(limit);

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map((inv) => this.mapToResponseDto(inv)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async updateInventory(
    variantId: string,
    dto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (
        dto.availableQuantity !== undefined &&
        dto.availableQuantity < 0
      ) {
        throw new BadRequestException('Available quantity cannot be negative');
      }

      if (
        dto.reservedQuantity !== undefined &&
        dto.reservedQuantity < 0
      ) {
        throw new BadRequestException('Reserved quantity cannot be negative');
      }

      if (
        dto.lowStockThreshold !== undefined &&
        dto.lowStockThreshold < 0
      ) {
        throw new BadRequestException('Low stock threshold cannot be negative');
      }

      if (dto.availableQuantity !== undefined) {
        inventory.availableQuantity = dto.availableQuantity;
      }
      if (dto.reservedQuantity !== undefined) {
        inventory.reservedQuantity = dto.reservedQuantity;
      }
      if (dto.lowStockThreshold !== undefined) {
        inventory.lowStockThreshold = dto.lowStockThreshold;
      }

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async adjustStock(
    variantId: string,
    dto: AdjustStockDto,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (dto.quantity <= 0) {
        throw new BadRequestException('Adjustment quantity must be positive');
      }

      if (dto.type === AdjustmentType.INCREASE) {
        inventory.availableQuantity += dto.quantity;
      } else if (dto.type === AdjustmentType.DECREASE) {
        if (inventory.availableQuantity < dto.quantity) {
          throw new BadRequestException(
            'Insufficient available stock for decrease adjustment',
          );
        }
        inventory.availableQuantity -= dto.quantity;
      }

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async increaseStock(
    variantId: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    return this.adjustStock(variantId, {
      type: AdjustmentType.INCREASE,
      quantity,
    });
  }

  async decreaseStock(
    variantId: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    return this.adjustStock(variantId, {
      type: AdjustmentType.DECREASE,
      quantity,
    });
  }

  async reserveStock(
    variantId: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (quantity <= 0) {
        throw new BadRequestException('Reservation quantity must be positive');
      }

      if (inventory.availableQuantity < quantity) {
        throw new BadRequestException(
          'Insufficient available quantity to reserve stock',
        );
      }

      inventory.availableQuantity -= quantity;
      inventory.reservedQuantity += quantity;

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async releaseReservation(
    variantId: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (quantity <= 0) {
        throw new BadRequestException('Release quantity must be positive');
      }

      if (inventory.reservedQuantity < quantity) {
        throw new BadRequestException(
          'Cannot release more than currently reserved quantity',
        );
      }

      inventory.reservedQuantity -= quantity;
      inventory.availableQuantity += quantity;

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async commitReservation(
    variantId: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (quantity <= 0) {
        throw new BadRequestException('Commit quantity must be positive');
      }

      if (inventory.reservedQuantity < quantity) {
        throw new BadRequestException(
          'Cannot commit more than currently reserved quantity',
        );
      }

      inventory.reservedQuantity -= quantity;

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async updateThreshold(
    variantId: string,
    dto: UpdateThresholdDto,
  ): Promise<InventoryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { variant: { id: variantId } },
        relations: { variant: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for variant');
      }

      if (dto.lowStockThreshold < 0) {
        throw new BadRequestException('Low stock threshold cannot be negative');
      }

      inventory.lowStockThreshold = dto.lowStockThreshold;

      const saved = await manager.save(inventory);
      return this.mapToResponseDto(saved);
    });
  }

  async isAvailable(
    variantId: string,
    requiredQuantity = 1,
  ): Promise<boolean> {
    const inventory = await this.inventoryRepository.findOne({
      where: { variant: { id: variantId } },
    });

    if (!inventory) {
      return false;
    }

    return inventory.availableQuantity >= requiredQuantity;
  }

  private mapToResponseDto(inventory: Inventory): InventoryResponseDto {
    return {
      id: inventory.id,
      productVariantId: inventory.productVariantId || inventory.variant?.id,
      sku: inventory.variant?.sku,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      isAvailable: inventory.isAvailable,
      isLowStock: inventory.isLowStock,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }
}
