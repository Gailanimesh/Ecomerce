import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { Product } from '../catalog/entities/product.entity';
import { Inventory } from '../inventory/entities/inventory.entity';

import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';

import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      ProductVariant,
      Product,
      Inventory,
    ]),
    CatalogModule,
    InventoryModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
