import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from '../../../common/enums/roles.enum';

export class AuthenticatedUserDto {
    @ApiProperty({
        description: 'User unique identifier (UUID)',
        example: 'c0b90489-9f22-431a-96c6-8a5854fbfb9c',
    })
    id!: string;

    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    email!: string;

    @ApiProperty({
        description: 'User first name',
        example: 'John',
    })
    firstName!: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
    })
    lastName!: string;

    @ApiProperty({
        description: 'User assigned role',
        enum: RoleEnum,
        example: RoleEnum.CUSTOMER,
    })
    role!: RoleEnum;

    @ApiProperty({
        description: 'Active session identifier (UUID)',
        example: 'de1909f2-0345-43d9-b8f1-5accdb00fcab',
    })
    sessionId!: string;
}

export class RegisterResponseDto {
    @ApiProperty({
        description: 'Status message indicating outcome',
        example: 'User registered successfully',
    })
    message!: string;

    @ApiProperty({
        description: 'Newly registered user profile',
        type: AuthenticatedUserDto,
    })
    user!: AuthenticatedUserDto;
}

export class AuthTokenResponseDto {
    @ApiProperty({
        description: 'JWT Access Token for authenticating protected routes',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken!: string;

    @ApiProperty({
        description: 'Authenticated user profile details',
        type: AuthenticatedUserDto,
    })
    user!: AuthenticatedUserDto;
}

export class MessageResponseDto {
    @ApiProperty({
        description: 'Response status message',
        example: 'Logged out successfully',
    })
    message!: string;
}
