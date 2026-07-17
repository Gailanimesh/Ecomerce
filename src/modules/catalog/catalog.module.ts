import { Module } from '@nestjs/common';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';


@Module({
    imports: [TypeOrmModule.forFeature([Category, Brand, Product, ProductVariant, ProductImage])],
    controllers: [CatalogController],
    providers: [CatalogService],
})
export class CatalogModule {}
