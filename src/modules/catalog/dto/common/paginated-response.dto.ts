export class PaginationMeta {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}

export class PaginatedResponseDto<T> {
  items!: T[];
  meta!: PaginationMeta;
}
