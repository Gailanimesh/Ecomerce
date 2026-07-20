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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { CategoryService } from './services/category.service';
import { BrandService } from './services/brand.service';
import { ProductService } from './services/product.service';

import { CreateCategoryDto } from './dto/category/create-category.dto';
import { UpdateCategoryDto } from './dto/category/update-category.dto';
import { CategoryResponseDto } from './dto/category/category-response.dto';
import { CreateBrandDto } from './dto/brand/create-brand.dto';
import { UpdateBrandDto } from './dto/brand/update-brand.dto';
import { BrandResponseDto } from './dto/brand/brand-response.dto';
import { CreateProductDto } from './dto/product/create-product.dto';
import { UpdateProductDto } from './dto/product/update-product.dto';
import { GetProductsQueryDto } from './dto/product/product-query.dto';
import {
  ProductResponseDto,
  PaginatedProductResponseDto,
} from './dto/product/product-response.dto';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleEnum } from '../../common/enums/roles.enum';
import { ProductStatus } from './enum/productstaus.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('Catalog')
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
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieves all catalog categories in a flat list with parent relationships. Publicly accessible.',
  })
  @ApiOkResponse({
    type: [CategoryResponseDto],
    description: 'List of all categories retrieved successfully.',
  })
  @Get('categories')
  getCategories() {
    return this.categoryService.getCategories();
  }

  @Public()
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieves details of a single category by its UUID. Publicly accessible.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Category details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Category with specified ID not found.',
  })
  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.categoryService.getCategoryById(id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create category',
    description: 'Creates a new root or subcategory. Category name must be unique under the same parent. Requires ADMIN role.',
  })
  @ApiCreatedResponse({
    type: CategoryResponseDto,
    description: 'Category created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiConflictResponse({
    description: 'Category with specified name already exists under the parent.',
  })
  @ApiNotFoundResponse({
    description: 'Specified parent category not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update category',
    description: 'Updates category details or parent hierarchy. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Category updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Category or target parent category not found.',
  })
  @ApiConflictResponse({
    description: 'Name conflict under target parent or category set as its own parent.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete category',
    description: 'Deletes a category if it has no child categories and no referencing products. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @ApiNoContentResponse({
    description: 'Category deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Category not found.',
  })
  @ApiConflictResponse({
    description: 'Cannot delete category that has child categories or referencing products.',
  })
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
  @ApiOperation({
    summary: 'Get all brands',
    description: 'Retrieves all active catalog brands. Publicly accessible.',
  })
  @ApiOkResponse({
    type: [BrandResponseDto],
    description: 'List of brands retrieved successfully.',
  })
  @Get('brands')
  getBrands() {
    return this.brandService.getBrands();
  }

  @Public()
  @ApiOperation({
    summary: 'Get brand by ID',
    description: 'Retrieves details of a single brand by its UUID. Publicly accessible.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    type: BrandResponseDto,
    description: 'Brand details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Brand with specified ID not found.',
  })
  @Get('brands/:id')
  getBrandById(@Param('id') id: string) {
    return this.brandService.getBrandById(id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create brand',
    description: 'Creates a new brand with a unique name. Requires ADMIN role.',
  })
  @ApiCreatedResponse({
    type: BrandResponseDto,
    description: 'Brand created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiConflictResponse({
    description: 'Brand with specified name already exists.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.brandService.createBrand(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update brand',
    description: 'Updates brand details or active status. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    type: BrandResponseDto,
    description: 'Brand updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Brand not found.',
  })
  @ApiConflictResponse({
    description: 'Brand with specified name already exists.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.updateBrand(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete brand',
    description: 'Deletes a brand if no products reference it. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiNoContentResponse({
    description: 'Brand deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Brand not found.',
  })
  @ApiConflictResponse({
    description: 'Cannot delete brand referenced by products.',
  })
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
  @ApiOperation({
    summary: 'Get paginated products',
    description: 'Retrieves a paginated list of products with optional search (q), filtering by brand, category, price range, and sorting. Publicly accessible. Admins can view DRAFT/ARCHIVED products.',
  })
  @ApiOkResponse({
    type: PaginatedProductResponseDto,
    description: 'Paginated list of products retrieved successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('products')
  getProducts(@Query() query: GetProductsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.getProducts(query, user?.role === RoleEnum.ADMIN);
  }

  @Public()
  @ApiOperation({
    summary: 'Get product by ID or Slug',
    description: 'Retrieves product details including variants and media by UUID or URL slug. Publicly accessible (Returns 404 for DRAFT/ARCHIVED products if requested by non-admin).',
  })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID) or URL slug',
    example: 'nike-air-max-90',
  })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Product details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Product not found or not published.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('products/:id')
  getProductById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      return this.productService.getProductById(id, user?.role === RoleEnum.ADMIN);
    } else {
      return this.productService.getProductBySlug(id, user?.role === RoleEnum.ADMIN);
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create product with variants and media',
    description: 'Creates a new product along with its variants and media assets in a single database transaction. Requires ADMIN role.',
  })
  @ApiCreatedResponse({
    type: ProductResponseDto,
    description: 'Product created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure or duplicate variant attribute combination.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Referenced Brand or Category not found.',
  })
  @ApiConflictResponse({
    description: 'Variant SKU already exists.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
    description: 'Updates product details or status. Validates status transitions (e.g. ARCHIVED cannot directly transition back to DRAFT). Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Product updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure or invalid status transition.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Product, Brand, or Category not found.',
  })
  @ApiConflictResponse({
    description: 'Product title conflict.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Archive product (Soft delete)',
    description: 'Soft deletes a product by updating its status to ARCHIVED. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiNoContentResponse({
    description: 'Product archived successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Product not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@Param('id') id: string) {
    return this.productService.updateProduct(id, { status: ProductStatus.ARCHIVED });
  }
}
