import { MediaType } from '../../entities/product-media.entity';

export class ProductMediaResponseDto {
  id!: string;
  url!: string;
  slug!: string;
  type!: MediaType;
  altText?: string;
  displayOrder!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
