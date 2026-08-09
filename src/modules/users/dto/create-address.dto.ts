import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Primary street address line.',
    example: '123 Main Street',
  })
  @IsString()
  @IsNotEmpty()
  street1!: string;

  @ApiPropertyOptional({
    description: 'Secondary address line (apartment, suite, unit, building).',
    example: 'Apt 4B',
  })
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty({
    description: 'City or municipality.',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({
    description: 'State, province, or region.',
    example: 'NY',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({
    description: 'Country name.',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({
    description: 'Postal or ZIP code.',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiPropertyOptional({
    description: 'Flag indicating whether to set as default delivery address.',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
