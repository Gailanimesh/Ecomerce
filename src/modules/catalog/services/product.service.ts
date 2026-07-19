import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';

import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductMedia } from '../entities/product-media.entity';
import { Category } from '../entities/category.entity';
import { Brand } from '../entities/brand.entity';
import { SlugService } from './slug.service';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { ProductResponseDto } from '../dto/product/product-response.dto';
import { GetProductsQueryDto } from '../dto/product/product-query.dto';
import { ProductStatus } from '../enum/productstaus.enum';
import { PaginatedResponseDto } from '../dto/common/paginated-response.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly slugService: SlugService,
    private readonly dataSource: DataSource,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<ProductResponseDto> {
    // 1. Business Validations (Before Transaction)
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const brand = await this.brandRepository.findOne({
      where: { id: dto.brandId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (!dto.variants || dto.variants.length === 0) {
      throw new BadRequestException('Every product must have at least one variant');
    }

    // SKU and option combination uniqueness within the incoming DTO
    const inputSkus = new Set<string>();
    const inputCombinations = new Set<string>();

    for (const v of dto.variants) {
      if (inputSkus.has(v.sku)) {
        throw new BadRequestException(`Duplicate SKU "${v.sku}" in variants list`);
      }
      inputSkus.add(v.sku);

      const combKey = `${v.color?.trim().toLowerCase() ?? ''}_${v.size?.trim().toLowerCase() ?? ''}`;
      if (inputCombinations.has(combKey)) {
        throw new BadRequestException(
          'Duplicate variant attribute combinations (color/size) are not allowed for the same product',
        );
      }
      inputCombinations.add(combKey);
    }

    // SKU uniqueness globally in database
    for (const v of dto.variants) {
      const existingSku = await this.productVariantRepository.findOne({
        where: { sku: v.sku },
      });
      if (existingSku) {
        throw new ConflictException(`SKU "${v.sku}" already exists`);
      }
    }

    // 2. Transaction Phase
    return await this.dataSource.transaction(async (manager) => {
      // Generate unique slug for product
      const productSlug = await this.slugService.generateUniqueSlug(
        dto.name,
        async (slugToCheck) => {
          const existing = await manager.findOne(Product, {
            where: { slug: slugToCheck },
          });
          return !!existing;
        },
      );

      const product = manager.create(Product, {
        name: dto.name,
        slug: productSlug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        status: dto.status ?? ProductStatus.DRAFT,
        brand,
        category,
        variants: [],
        media: [],
      });

      const savedProduct = await manager.save(product);

      // Create variants
      const savedVariants: ProductVariant[] = [];
      for (const v of dto.variants) {
        const variantSlug = await this.slugService.generateUniqueSlug(
          `${dto.name}-${v.sku}`,
          async (slugToCheck) => {
            const existing = await manager.findOne(ProductVariant, {
              where: { slug: slugToCheck },
            });
            return !!existing;
          },
        );

        const variant = manager.create(ProductVariant, {
          sku: v.sku,
          slug: variantSlug,
          price: v.price,
          color: v.color,
          size: v.size,
          isActive: v.isActive ?? true,
          product: savedProduct,
        });
        const savedV = await manager.save(variant);
        savedVariants.push(savedV);
      }

      // Create media
      const savedMedia: ProductMedia[] = [];
      if (dto.media && dto.media.length > 0) {
        for (const m of dto.media) {
          const mediaSlug = await this.slugService.generateUniqueSlug(
            `${productSlug}-media-${randomUUID()}`,
            async (slugToCheck) => {
              const existing = await manager.findOne(ProductMedia, {
                where: { slug: slugToCheck },
              });
              return !!existing;
            },
          );

          const media = manager.create(ProductMedia, {
            url: m.url,
            slug: mediaSlug,
            type: m.type,
            altText: m.altText,
            displayOrder: m.displayOrder ?? 0,
            isActive: m.isActive ?? true,
            product: savedProduct,
          });
          const savedM = await manager.save(media);
          savedMedia.push(savedM);
        }
      }

      savedProduct.variants = savedVariants;
      savedProduct.media = savedMedia;

      return this.mapToProductResponseDto(savedProduct);
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { brand: true, category: true, variants: true, media: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.brandId) {
      const brand = await this.brandRepository.findOne({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException('Brand not found');
      product.brand = brand;
    }

    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
      product.category = category;
    }

    if (dto.name) {
      product.name = dto.name;
      product.slug = await this.slugService.generateUniqueSlug(
        dto.name,
        async (slugToCheck) => {
          const existing = await this.productRepository.findOne({
            where: { slug: slugToCheck },
          });
          return !!existing && existing.id !== id;
        },
      );
    }

    if (dto.description !== undefined) {
      product.description = dto.description;
    }

    if (dto.shortDescription !== undefined) {
      product.shortDescription = dto.shortDescription;
    }

    if (dto.status && dto.status !== product.status) {
      const current = product.status;
      const target = dto.status;

      if (current === ProductStatus.ARCHIVED && target === ProductStatus.DRAFT) {
        throw new BadRequestException('Cannot transition product from ARCHIVED directly to DRAFT');
      }
      product.status = target;
    }

    const saved = await this.productRepository.save(product);
    return this.mapToProductResponseDto(saved);
  }

  async getProducts(
    queryDto: GetProductsQueryDto,
    isAdmin = false,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.media', 'media');

    // Visibility rules: Customers cannot see DRAFT or ARCHIVED
    if (!isAdmin) {
      queryBuilder.andWhere('product.status = :activeStatus', {
        activeStatus: ProductStatus.ACTIVE,
      });
    } else if (queryDto.status) {
      queryBuilder.andWhere('product.status = :status', { status: queryDto.status });
    }

    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    // Category filter
    if (queryDto.category) {
      // Find category by ID or slug first
      const category = await this.categoryRepository.findOne({
        where: isUuid(queryDto.category) ? { id: queryDto.category } : { slug: queryDto.category },
      });
      if (category) {
        queryBuilder.andWhere('product.categoryId = :catId', { catId: category.id });
      } else {
        // Return empty result set if category filter is specified but doesn't exist
        queryBuilder.andWhere('1 = 0');
      }
    }

    // Brand filter
    if (queryDto.brand) {
      const brand = await this.brandRepository.findOne({
        where: isUuid(queryDto.brand) ? { id: queryDto.brand } : { slug: queryDto.brand },
      });
      if (brand) {
        queryBuilder.andWhere('product.brandId = :brandId', { brandId: brand.id });
      } else {
        queryBuilder.andWhere('1 = 0');
      }
    }

    // Price range filters
    if (queryDto.minPrice !== undefined) {
      queryBuilder.andWhere('variants.price >= :minPrice', { minPrice: queryDto.minPrice });
    }
    if (queryDto.maxPrice !== undefined) {
      queryBuilder.andWhere('variants.price <= :maxPrice', { maxPrice: queryDto.maxPrice });
    }

    // Searching q: name, description, brand name, category name, or variant SKU
    if (queryDto.q) {
      const wildcard = `%${queryDto.q.trim()}%`;
      queryBuilder.andWhere(
        '(product.name ILIKE :wildcard OR product.description ILIKE :wildcard OR brand.name ILIKE :wildcard OR category.name ILIKE :wildcard OR variants.sku ILIKE :wildcard)',
        { wildcard },
      );
    }

    // Sorting
    if (queryDto.sort) {
      const order = queryDto.sort.startsWith('-') ? 'DESC' : 'ASC';
      const cleanSort = queryDto.sort.replace(/^-/, '');

      if (cleanSort === 'name') {
        queryBuilder.orderBy('product.name', order);
      } else if (cleanSort === 'createdAt') {
        queryBuilder.orderBy('product.createdAt', order);
      } else if (cleanSort === 'price') {
        queryBuilder.orderBy('variants.price', order);
      } else {
        queryBuilder.orderBy('product.createdAt', 'DESC');
      }
    } else {
      queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    // Skip & Take
    queryBuilder.skip(skip).take(limit);

    const [products, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: products.map((p) => this.mapToProductResponseDto(p)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async getProductById(id: string, isAdmin = false): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { brand: true, category: true, variants: true, media: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!isAdmin && product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToProductResponseDto(product);
  }

  async getProductBySlug(slug: string, isAdmin = false): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: { brand: true, category: true, variants: true, media: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!isAdmin && product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToProductResponseDto(product);
  }

  private mapToProductResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      brand: product.brand ? {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
        description: product.brand.description,
        logoUrl: product.brand.logoUrl,
        isActive: product.brand.isActive,
        createdAt: product.brand.createdAt,
        updatedAt: product.brand.updatedAt,
      } : undefined,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        parentId: product.category.parent?.id,
        createdAt: product.category.createdAt,
        updatedAt: product.category.updatedAt,
      } : undefined,
      variants: product.variants?.map((v) => ({
        id: v.id,
        sku: v.sku,
        slug: v.slug,
        price: v.price,
        color: v.color,
        size: v.size,
        isActive: v.isActive,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })) || [],
      media: product.media?.map((m) => ({
        id: m.id,
        url: m.url,
        slug: m.slug,
        type: m.type,
        altText: m.altText,
        displayOrder: m.displayOrder,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })) || [],
    };
  }
}
