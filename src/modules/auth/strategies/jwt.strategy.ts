import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { AccessTokenPayload } from '../interfaces/jwt-payload.interface';
import { ACCESS_TOKEN_TYPE } from '../constants/auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
        });
    }

    async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
        if (payload.type !== ACCESS_TOKEN_TYPE) {
            throw new UnauthorizedException('Invalid authentication token');
        }

        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
            relations: { role: true },
        });

        if (!user || !user.role) {
            throw new UnauthorizedException('Invalid authentication token');
        }

        if (payload.email !== user.email || payload.roleId !== user.role.id) {
            throw new UnauthorizedException('Invalid authentication token');
        }

        return this.toAuthenticatedUser(user);
    }

    private toAuthenticatedUser(user: User): AuthenticatedUser {
        const [firstName = '', ...rest] = user.fullName.trim().split(/\s+/);

        return {
            id: user.id,
            email: user.email,
            firstName,
            lastName: rest.join(' '),
        };
    }
}