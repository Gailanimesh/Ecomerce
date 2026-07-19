import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

import { ConfigModule, ConfigService } from '@nestjs/config';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
@Module({
  imports: [LoggerModule.forRoot(),
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`,
      '.env',],

    load: [
      appConfig,
      authConfig,
      databaseConfig,
    ],
  }),
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],

    useFactory: (configService: ConfigService) => ({
      type: 'postgres',

      host: configService.get<string>('database.host'),

      port: configService.get<number>('database.port'),

      username: configService.get<string>('database.username'),

      password: configService.get<string>('database.password'),

      database: configService.get<string>('database.database'),

      synchronize: configService.get<boolean>('database.synchronize'),

      autoLoadEntities: configService.get<boolean>('database.autoLoadEntities'),

      logging: configService.get<boolean>('database.logging'),
    }),
  }),
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    ReviewsModule,
    WishlistModule,
    ShippingModule,
    NotificationsModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
