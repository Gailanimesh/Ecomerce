import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Unique brand name',
    example: 'Nike',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

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
}
