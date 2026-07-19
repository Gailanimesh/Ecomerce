export class ProductVariantResponseDto {
  id!: string;
  sku!: string;
  slug!: string;
  price!: string;
  color?: string;
  size?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
