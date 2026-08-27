import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderHistory } from './entities/order-history.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../users/entities/address.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Product } from '../catalog/entities/product.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';

import { OrdersService } from './services/orders.service';
import { OrderNumberService } from './services/order-number.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderHistory,
      Cart,
      CartItem,
      Address,
      Inventory,
      Product,
      ProductVariant,
    ]),
    CouponsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, InventoryService],
  exports: [OrdersService, OrderNumberService],
})
export class OrdersModule {}
