import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Coupon } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { CouponsService } from './services/coupons.service';
import { CouponsController } from './controllers/coupons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponUsage])],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
