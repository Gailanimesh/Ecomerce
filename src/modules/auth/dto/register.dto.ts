import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    email!: string;

    @ApiProperty({
        description: 'User password (minimum 8 characters, maximum 72 characters)',
        example: 'Password123!',
        minLength: 8,
        maxLength: 72,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password!: string;

    @ApiProperty({
        description: 'User first name',
        example: 'John',
        maxLength: 100,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    firstName!: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
        maxLength: 100,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    lastName!: string;
}