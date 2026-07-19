import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CategoryService } from './services/category.service';
import { BrandService } from './services/brand.service';
import { ProductService } from './services/product.service';

import { CreateCategoryDto } from './dto/category/create-category.dto';
import { UpdateCategoryDto } from './dto/category/update-category.dto';
import { CreateBrandDto } from './dto/brand/create-brand.dto';
import { UpdateBrandDto } from './dto/brand/update-brand.dto';
import { CreateProductDto } from './dto/product/create-product.dto';
import { UpdateProductDto } from './dto/product/update-product.dto';
import { GetProductsQueryDto } from './dto/product/product-query.dto';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleEnum } from '../../common/enums/roles.enum';
import { ProductStatus } from './enum/productstaus.enum';

@Controller()
export class CatalogController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly brandService: BrandService,
    private readonly productService: ProductService,
  ) {}

  // ==========================================
  // Categories Endpoints
  // ==========================================

  @Public()
  @Get('categories')
  getCategories() {
    return this.categoryService.getCategories();
  }

  @Public()
  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.categoryService.getCategoryById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }

  // ==========================================
  // Brands Endpoints
  // ==========================================

  @Public()
  @Get('brands')
  getBrands() {
    return this.brandService.getBrands();
  }

  @Public()
  @Get('brands/:id')
  getBrandById(@Param('id') id: string) {
    return this.brandService.getBrandById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.brandService.createBrand(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.updateBrand(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Delete('brands/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBrand(@Param('id') id: string) {
    return this.brandService.deleteBrand(id);
  }

  // ==========================================
  // Products Endpoints
  // ==========================================

  @Public()
  @Get('products')
  getProducts(@Query() query: GetProductsQueryDto) {
    return this.productService.getProducts(query, false);
  }

  @Public()
  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      return this.productService.getProductById(id, false);
    } else {
      return this.productService.getProductBySlug(id, false);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@Param('id') id: string) {
    return this.productService.updateProduct(id, { status: ProductStatus.ARCHIVED });
  }
}
