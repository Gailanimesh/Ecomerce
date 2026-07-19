import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Brand } from '../entities/brand.entity';
import { Product } from '../entities/product.entity';
import { SlugService } from './slug.service';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';
import { UpdateBrandDto } from '../dto/brand/update-brand.dto';
import { BrandResponseDto } from '../dto/brand/brand-response.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly slugService: SlugService,
  ) {}

  async createBrand(dto: CreateBrandDto): Promise<BrandResponseDto> {
    const existingName = await this.brandRepository.findOne({
      where: { name: dto.name },
    });

    if (existingName) {
      throw new ConflictException('Brand with this name already exists');
    }

    const slug = await this.slugService.generateUniqueSlug(
      dto.name,
      async (slugToCheck) => {
        const existing = await this.brandRepository.findOne({
          where: { slug: slugToCheck },
        });
        return !!existing;
      },
    );

    const brand = this.brandRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      logoUrl: dto.logoUrl,
    });

    const savedBrand = await this.brandRepository.save(brand);
    return this.mapToResponseDto(savedBrand);
  }

  async updateBrand(
    id: string,
    dto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (dto.name) {
      const existingName = await this.brandRepository.findOne({
        where: { name: dto.name },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException('Brand with this name already exists');
      }

      brand.name = dto.name;
      brand.slug = await this.slugService.generateUniqueSlug(
        dto.name,
        async (slugToCheck) => {
          const existing = await this.brandRepository.findOne({
            where: { slug: slugToCheck },
          });
          return !!existing && existing.id !== id;
        },
      );
    }

    if (dto.description !== undefined) {
      brand.description = dto.description;
    }

    if (dto.logoUrl !== undefined) {
      brand.logoUrl = dto.logoUrl;
    }

    if (dto.isActive !== undefined) {
      brand.isActive = dto.isActive;
    }

    const updatedBrand = await this.brandRepository.save(brand);
    return this.mapToResponseDto(updatedBrand);
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Fail if products reference this brand
    const productCount = await this.productRepository.count({
      where: { brand: { id } },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete brand referenced by products',
      );
    }

    await this.brandRepository.remove(brand);
  }

  async getBrands(): Promise<BrandResponseDto[]> {
    const brands = await this.brandRepository.find();
    return brands.map((b) => this.mapToResponseDto(b));
  }

  async getBrandById(id: string): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return this.mapToResponseDto(brand);
  }

  private mapToResponseDto(brand: Brand): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoUrl,
      isActive: brand.isActive,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }
}
