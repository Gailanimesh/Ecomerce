import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: '123 Main Street' })
  street1!: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  street2?: string;

  @ApiProperty({ example: 'New York' })
  city!: string;

  @ApiProperty({ example: 'NY' })
  state!: string;

  @ApiProperty({ example: 'USA' })
  country!: string;

  @ApiProperty({ example: '10001' })
  postalCode!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
