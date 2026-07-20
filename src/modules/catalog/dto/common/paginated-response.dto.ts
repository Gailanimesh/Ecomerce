import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 42,
  })
  totalItems!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages!: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of result items',
    isArray: true,
  })
  items!: T[];

  @ApiProperty({
    description: 'Pagination metadata details',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;
}
