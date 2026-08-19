import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Review } from './entities/review.entity';
import { Product } from '../catalog/entities/product.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

import { ReviewsService } from './services/reviews.service';
import { ReviewsController } from './controllers/reviews.controller';
import { AdminReviewsController } from './controllers/admin-reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Product,
      ProductVariant,
      OrderItem,
      Order,
      User,
    ]),
  ],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
