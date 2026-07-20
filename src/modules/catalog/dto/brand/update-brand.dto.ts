import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsBoolean } from 'class-validator';

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'Unique brand name',
    example: 'Nike',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the brand',
    example: 'Global leader in athletic footwear, apparel, and equipment.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Brand logo image URL',
    example: 'https://cdn.example.com/brands/nike-logo.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Active status of the brand',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
