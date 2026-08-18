import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '../../entities/product-media.entity';

export class UploadProductMediaDto {
  @ApiPropertyOptional({
    description: 'Alternative text for SEO and accessibility',
    example: 'Nike Air Max black running shoe side view',
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({
    description: 'Display order priority (0 for primary asset)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Explicit media type (IMAGE or VIDEO). Inferred from MIME type if omitted.',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;
}
