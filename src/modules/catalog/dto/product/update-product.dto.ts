import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductStatus } from '../../enum/productstaus.enum';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product title / name',
    example: 'Nike Air Max 90 Premium',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Full product description',
    example: 'Updated description for the Nike Air Max 90.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Short summary description',
    example: 'Updated short description.',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Associated Brand UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Associated Category UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product lifecycle status transition (DRAFT, ACTIVE, or ARCHIVED)',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
