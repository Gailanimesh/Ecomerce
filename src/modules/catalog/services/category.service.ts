import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { SlugService } from './slug.service';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { CategoryResponseDto } from '../dto/category/category-response.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly slugService: SlugService,
  ) {}

  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    let parent: Category | null = null;
    if (dto.parentId) {
      parent = await this.categoryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Name must be unique within same parent
    const existingName = await this.categoryRepository.findOne({
      where: {
        name: dto.name,
        parent: dto.parentId ? { id: dto.parentId } : IsNull(),
      },
    });

    if (existingName) {
      throw new ConflictException(
        'Category with this name already exists under the same parent',
      );
    }

    const slug = await this.slugService.generateUniqueSlug(
      dto.name,
      async (slugToCheck) => {
        const existing = await this.categoryRepository.findOne({
          where: { slug: slugToCheck },
        });
        return !!existing;
      },
    );

    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      parent: parent || undefined,
    });

    const savedCategory = await this.categoryRepository.save(category);
    return this.mapToResponseDto(savedCategory);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { parent: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }
      if (dto.parentId) {
        const parent = await this.categoryRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
        category.parent = parent;
      } else {
        category.parent = undefined;
      }
    }

    if (dto.name) {
      const parentId = category.parent?.id;
      // Name must be unique within same parent
      const existingName = await this.categoryRepository.findOne({
        where: {
          name: dto.name,
          parent: parentId ? { id: parentId } : IsNull(),
        },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException(
          'Category with this name already exists under the same parent',
        );
      }

      category.name = dto.name;
      category.slug = await this.slugService.generateUniqueSlug(
        dto.name,
        async (slugToCheck) => {
          const existing = await this.categoryRepository.findOne({
            where: { slug: slugToCheck },
          });
          return !!existing && existing.id !== id;
        },
      );
    }

    const updatedCategory = await this.categoryRepository.save(category);
    return this.mapToResponseDto(updatedCategory);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Fail if direct child categories exist
    const childCount = await this.categoryRepository.count({
      where: { parent: { id } },
    });
    if (childCount > 0) {
      throw new ConflictException(
        'Cannot delete category that has child categories',
      );
    }

    // Fail if any products reference this category
    const productCount = await this.productRepository.count({
      where: { category: { id } },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete category referenced by products',
      );
    }

    await this.categoryRepository.remove(category);
  }

  async getCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      relations: { parent: true },
    });
    return categories.map((c) => this.mapToResponseDto(c));
  }

  async getCategoryById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { parent: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  private mapToResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parent?.id,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
