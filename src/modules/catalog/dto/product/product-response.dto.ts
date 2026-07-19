import { ProductStatus } from '../../enum/productstaus.enum';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { ProductVariantResponseDto } from '../variant/product-variant-response.dto';
import { ProductMediaResponseDto } from '../media/product-media-response.dto';

export class ProductResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  shortDescription?: string;
  status!: ProductStatus;
  createdAt!: Date;
  updatedAt!: Date;
  brand?: BrandResponseDto;
  category?: CategoryResponseDto;
  variants?: ProductVariantResponseDto[];
  media?: ProductMediaResponseDto[];
}
