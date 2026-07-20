import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiConflictResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
    AuthenticatedUserDto,
    AuthTokenResponseDto,
    RegisterResponseDto,
    MessageResponseDto,
} from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { RoleEnum } from '../../common/enums/roles.enum';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { AuthRequest } from './interfaces/auth-request.interface';

@ApiTags('Authentication')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @ApiOperation({
        summary: 'Register a new user account',
        description: 'Creates a new user account with profile details and assigns the CUSTOMER role. Publicly accessible.',
    })
    @ApiCreatedResponse({
        type: RegisterResponseDto,
        description: 'User account registered successfully.',
    })
    @ApiBadRequestResponse({
        description: 'Validation failure on request body fields.',
    })
    @ApiConflictResponse({
        description: 'Email address is already registered.',
    })
    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @ApiOperation({
        summary: 'Authenticate user & issue session tokens',
        description: 'Validates email and password credentials, creates a new active session, returns a JWT access token, and sets a HttpOnly refresh token cookie. Publicly accessible.',
    })
    @ApiCreatedResponse({
        type: AuthTokenResponseDto,
        description: 'Login successful. JWT access token returned in response body and refresh cookie set.',
    })
    @ApiBadRequestResponse({
        description: 'Validation failure or missing required credentials.',
    })
    @ApiUnauthorizedResponse({
        description: 'Invalid email or password credentials.',
    })
    @Post('login')
    login(
        @Body() loginDto: LoginDto,
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.login(loginDto, request, response);
    }

    @Public()
    @ApiOperation({
        summary: 'Rotate refresh token and issue new access token',
        description: 'Reads the refresh token from the HttpOnly cookie, validates the active session, rotates the refresh token cookie, and returns a new JWT access token. Publicly accessible.',
    })
    @ApiCreatedResponse({
        type: AuthTokenResponseDto,
        description: 'Token refresh successful. New access token issued.',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing, invalid, or expired refresh token cookie.',
    })
    @Post('refresh')
    refresh(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.refresh(request, response);
    }

    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get current authenticated user profile',
        description: 'Returns profile details and current active session info for the authenticated user. Requires Bearer JWT authentication.',
    })
    @ApiOkResponse({
        type: AuthenticatedUserDto,
        description: 'Authenticated user profile retrieved successfully.',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid Bearer JWT access token.',
    })
    @Get('me')
    me(@CurrentUser() user: AuthenticatedUser) {
        return user;
    }

    @Public()
    @ApiOperation({
        summary: 'Logout current session',
        description: 'Revokes the current active session identified by the HttpOnly refresh token cookie and clears the cookie. Publicly accessible.',
    })
    @ApiCreatedResponse({
        type: MessageResponseDto,
        description: 'Logged out successfully and session revoked.',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid refresh token cookie.',
    })
    @Post('logout')
    logout(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.logout(request, response);
    }

    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Logout from all active sessions',
        description: 'Revokes all active sessions for the authenticated user across all devices and clears the refresh cookie. Requires Bearer JWT authentication.',
    })
    @ApiCreatedResponse({
        type: MessageResponseDto,
        description: 'All user sessions revoked successfully.',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid Bearer JWT access token.',
    })
    @Post('logout-all')
    logoutAll(
        @CurrentUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.logoutAll(user.id, response);
    }

    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Test administrator authorization access',
        description: 'Test endpoint to verify ADMIN role authorization. Requires ADMIN role.',
    })
    @ApiOkResponse({
        description: 'Admin access confirmed.',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid Bearer JWT access token.',
    })
    @ApiForbiddenResponse({
        description: 'Access denied. Requires ADMIN role.',
    })
    @Get('admin-test')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleEnum.ADMIN)
    adminTest() {
        return { message: 'Admin access granted' };
    }
}
