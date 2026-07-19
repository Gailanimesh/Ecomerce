import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductMedia } from './entities/product-media.entity';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogController } from './catalog.controller';

import { SlugService } from './services/slug.service';
import { CategoryService } from './services/category.service';
import { BrandService } from './services/brand.service';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Brand,
      Product,
      ProductVariant,
      ProductMedia,
    ]),
  ],
  controllers: [CatalogController],
  providers: [SlugService, CategoryService, BrandService, ProductService],
  exports: [SlugService, CategoryService, BrandService, ProductService],
})
export class CatalogModule {}
