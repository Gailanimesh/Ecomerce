import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../enum/productstaus.enum';
import { MediaType } from '../../entities/product-media.entity';

export class CreateProductMediaDto {
  @ApiProperty({
    description: 'Direct asset URL of the media file',
    example: 'https://cdn.example.com/products/nike-air-max-1.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Type of media asset (IMAGE or VIDEO)',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  type!: MediaType;

  @ApiPropertyOptional({
    description: 'Alternative text for SEO and accessibility',
    example: 'Nike Air Max 90 Black/Red side view',
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({
    description: 'Display order priority (0 for primary display thumbnail)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Active status of the media asset',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class CreateProductVariantDto {
  @ApiProperty({
    description: 'Stock Keeping Unit (SKU) code - must be unique across all variants',
    example: 'NIK-AM90-BLK-10',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({
    description: 'Selling price formatted as decimal string',
    example: '149.99',
  })
  @IsNumberString()
  @IsNotEmpty()
  price!: string;

  @ApiPropertyOptional({
    description: 'Color attribute',
    example: 'Black/Red',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Size attribute',
    example: '10',
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Active status of the variant',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product title / name',
    example: 'Nike Air Max 90',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Full product description with features and specifications',
    example: 'The Nike Air Max 90 stays true to its OG running roots with iconic Waffle outsole, stitched overlays and classic TPU accents.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Short summary description for product cards and listings',
    example: 'Classic footwear with maximum cushioning.',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({
    description: 'Associated Brand UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  brandId!: string;

  @ApiProperty({
    description: 'Associated Category UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({
    description: 'Initial product publishing status (DRAFT, ACTIVE, or ARCHIVED)',
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
    default: ProductStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.DRAFT;

  @ApiProperty({
    description: 'Array of product variants (at least one variant required)',
    type: [CreateProductVariantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];

  @ApiPropertyOptional({
    description: 'Optional array of associated media assets (images or videos)',
    type: [CreateProductMediaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMediaDto)
  media?: CreateProductMediaDto[] = [];
}
