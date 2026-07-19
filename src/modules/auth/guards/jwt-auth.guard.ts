import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { AUTH_PUBLIC_KEY } from '../constants/auth.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    override canActivate(context: any) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    override handleRequest(error: unknown, user: unknown): any{
        if (error || !user) {
            throw error instanceof UnauthorizedException
                ? error
                : new UnauthorizedException('Unauthorized');
        }

        return user;
    }
}