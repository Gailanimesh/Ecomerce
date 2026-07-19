export class BrandResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  logoUrl?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
