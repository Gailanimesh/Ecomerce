import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { RoleEnum } from '../../common/enums/roles.enum';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { AuthRequest } from './interfaces/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    login(
        @Body() loginDto: LoginDto,
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.login(loginDto, request, response);
    }

    @Public()
    @Post('refresh')
    refresh(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.refresh(request, response);
    }

    @Get('me')
    me(@CurrentUser() user: AuthenticatedUser) {
        return user;
    }

    @Public()
    @Post('logout')
    logout(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.logout(request, response);
    }

    @Post('logout-all')
    logoutAll(
        @CurrentUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.logoutAll(user.id, response);
    }

    @Get('admin-test')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleEnum.ADMIN)
    adminTest() {
        return { message: 'Admin access granted' };
    }
}
