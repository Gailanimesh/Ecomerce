import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { Session } from './entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { AuthRequest } from './interfaces/auth-request.interface';
import {
    AccessTokenPayload,
    RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import {
    ACCESS_TOKEN_TYPE,
    AUTH_REFRESH_COOKIE_NAME,
    AUTH_REFRESH_COOKIE_PATH,
    REFRESH_TOKEN_TYPE,
} from './constants/auth.constants';
import { RoleEnum } from '../../common/enums/roles.enum';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(dto: RegisterDto): Promise<{
        message: string;
        user: AuthenticatedUser;
    }> {
        try {
            const existingUser = await this.userRepository.findOne({
                where: { email: dto.email },
            });

            if (existingUser) {
                throw new ConflictException('Email already exists');
            }

            const role = await this.getDefaultRole();
            const passwordHash = await this.hashPassword(dto.password);

            const user = this.userRepository.create({
                fullName: this.buildFullName(dto.firstName, dto.lastName),
                email: dto.email.toLowerCase(),
                passwordHash,
                role,
            });

            const savedUser = await this.userRepository.save(user);

            return {
                message: 'User registered successfully',
                user: this.sanitizeUser(savedUser, undefined, dto.firstName, dto.lastName),
            };
        } catch (error) {
            this.handleUnexpectedError(error);
        }
    }

    async login(
        dto: LoginDto,
        request: AuthRequest,
        response: Response,
    ): Promise<{
        accessToken: string;
        user: AuthenticatedUser;
    }> {
        try {
            const user = await this.findUserByEmail(dto.email);

            const passwordValid = await this.verifyPassword(
                dto.password,
                user.passwordHash,
            );

            if (!passwordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }

            const sessionId = randomUUID();
            const refreshToken = await this.generateRefreshToken(user, sessionId);
            const refreshTokenHash = await this.hashRefreshToken(refreshToken);

            const session = this.sessionRepository.create({
                id: sessionId,
                user,
                refreshTokenHash,
                expiresAt: this.buildRefreshExpirationDate(),
                ipAddress: request.ip,
                userAgent: this.getUserAgent(request),
            });

            await this.sessionRepository.save(session);

            const accessToken = await this.generateAccessToken(user, sessionId);

            this.setRefreshCookie(response, refreshToken);
            console.log(response.getHeaders());
            return {
                accessToken,
                user: this.sanitizeUser(user, sessionId),
            };
        } catch (error) {
            this.handleUnexpectedError(error);
        }
    }

    async refresh(
        request: AuthRequest,
        response: Response,
    ): Promise<{
        accessToken: string;
    }> {
        try {
            const refreshToken = this.getRefreshTokenFromRequest(request);
            const payload = await this.verifyRefreshToken(refreshToken);

            if (payload.type !== REFRESH_TOKEN_TYPE) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            const session = await this.sessionRepository.findOne({
                where: { id: payload.sid },
                relations: { user: true },
            });

            if (!session || !session.user) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            if (session.expiresAt.getTime() <= Date.now()) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            if (payload.sub !== session.user.id) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            const tokenMatches = await this.compareHash(
                refreshToken,
                session.refreshTokenHash,
            );

            if (!tokenMatches) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            const newRefreshToken = await this.generateRefreshToken(
                session.user,
                session.id,
            );

            session.refreshTokenHash = await this.hashRefreshToken(newRefreshToken);
            session.expiresAt = this.buildRefreshExpirationDate();
            session.ipAddress = request.ip ?? session.ipAddress;
            session.userAgent = this.getUserAgent(request) ?? session.userAgent;

            await this.sessionRepository.save(session);

            const accessToken = await this.generateAccessToken(session.user, session.id);

            this.setRefreshCookie(response, newRefreshToken);

            return { accessToken };
        } catch (error) {
            this.handleUnexpectedError(error);
        }
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.sessionRepository.delete({ id: sessionId });
    }

    async deleteAllSessions(userId: string): Promise<void> {
        await this.sessionRepository.delete({ user: { id: userId } });
    }

    async logout(
        request: AuthRequest,
        response: Response,
    ): Promise<{ message: string }> {
        try {
            const refreshToken = this.getRefreshTokenFromRequest(request);
            let payload: RefreshTokenPayload;
            try {
                payload = await this.verifyRefreshToken(refreshToken);
            } catch (error) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            if (payload.type !== REFRESH_TOKEN_TYPE) {
                throw new UnauthorizedException('Invalid authentication token');
            }

            await this.deleteSession(payload.sid);
            this.clearRefreshCookie(response);

            return { message: 'Logged out successfully' };
        } catch (error) {
            this.handleUnexpectedError(error);
        }
    }

    async logoutAll(
        userId: string,
        response: Response,
    ): Promise<{ message: string }> {
        try {
            await this.deleteAllSessions(userId);
            this.clearRefreshCookie(response);

            return { message: 'Logged out from all devices successfully' };
        } catch (error) {
            this.handleUnexpectedError(error);
        }
    }

    private async findUserByEmail(email: string): Promise<User> {
        const normalizedEmail = email.toLowerCase();
        const user = await this.userRepository.findOne({
            where: { email: normalizedEmail },
            relations: { role: true },
        });

        if (!user || !user.role) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    private async getDefaultRole(): Promise<Role> {
        const existingRole = await this.roleRepository.findOne({
            where: { name: RoleEnum.CUSTOMER },
        });

        if (existingRole) {
            return existingRole;
        }

        const role = this.roleRepository.create({ name: RoleEnum.CUSTOMER });
        return this.roleRepository.save(role);
    }

    private async hashPassword(password: string): Promise<string> {
        return hash(
            password,
            this.configService.get<number>('auth.bcryptSaltRounds', 12),
        );
    }

    private async verifyPassword(
        plainPassword: string,
        passwordHash: string,
    ): Promise<boolean> {
        return compare(plainPassword, passwordHash);
    }

    private async hashRefreshToken(refreshToken: string): Promise<string> {
        return hash(
            refreshToken,
            this.configService.get<number>('auth.bcryptSaltRounds', 12),
        );
    }

    private async compareHash(
        plainValue: string,
        hashedValue: string,
    ): Promise<boolean> {
        return compare(plainValue, hashedValue);
    }

    private async generateAccessToken(
        user: User,
        sessionId: string,
    ): Promise<string> {
        return this.jwtService.signAsync(this.buildAccessTokenPayload(user, sessionId), {
            secret: this.configService.getOrThrow<string>('auth.accessSecret'),
            expiresIn:
                this.configService.getOrThrow<string>('auth.accessExpiresIn') as any,
        });
    }

    private async generateRefreshToken(
        user: User,
        sessionId: string,
    ): Promise<string> {
        return this.jwtService.signAsync(this.buildRefreshTokenPayload(user, sessionId), {
            secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
            expiresIn:
                this.configService.getOrThrow<string>('auth.refreshExpiresIn') as any,
        });
    }

    private async verifyRefreshToken(
        refreshToken: string,
    ): Promise<RefreshTokenPayload> {
        return this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
            secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
        });
    }

    private buildAccessTokenPayload(
        user: User,
        sessionId: string,
    ): AccessTokenPayload {
        if (!user.role) {
            throw new UnauthorizedException('Authentication failed');
        }

        return {
            sub: user.id,
            email: user.email,
            roleId: user.role.id,
            sid: sessionId,
            type: ACCESS_TOKEN_TYPE,
        };
    }

    private buildRefreshTokenPayload(
        user: User,
        sessionId: string,
    ): RefreshTokenPayload {
        return {
            sub: user.id,
            sid: sessionId,
            type: REFRESH_TOKEN_TYPE,
        };
    }

    private setRefreshCookie(response: Response, refreshToken: string): void {
        response.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: this.isProduction(),
            sameSite: 'lax',
            path: AUTH_REFRESH_COOKIE_PATH,
            maxAge: this.getRefreshTokenMaxAgeMs(),
        });
    }

    private clearRefreshCookie(response: Response): void {
        response.clearCookie(AUTH_REFRESH_COOKIE_NAME, {
            httpOnly: true,
            secure: this.isProduction(),
            sameSite: 'lax',
            path: AUTH_REFRESH_COOKIE_PATH,
        });
    }

    private sanitizeUser(
        user: User,
        sessionId?: string,
        firstNameOverride?: string,
        lastNameOverride?: string,
    ): AuthenticatedUser {
        const nameParts = this.splitFullName(user.fullName);

        return {
            id: user.id,
            email: user.email,
            firstName: firstNameOverride ?? nameParts.firstName,
            lastName: lastNameOverride ?? nameParts.lastName,
            role: user.role?.name,
            sessionId,
        };
    }

    private splitFullName(fullName: string): {
        firstName: string;
        lastName: string;
    } {
        const trimmedName = fullName.trim();

        if (!trimmedName) {
            return {
                firstName: '',
                lastName: '',
            };
        }

        const [firstName, ...rest] = trimmedName.split(/\s+/);

        return {
            firstName: firstName ?? '',
            lastName: rest.join(' '),
        };
    }

    private buildFullName(firstName: string, lastName: string): string {
        return `${firstName.trim()} ${lastName.trim()}`.trim();
    }

    private buildRefreshExpirationDate(): Date {
        return new Date(Date.now() + this.getRefreshTokenMaxAgeMs());
    }

    private getRefreshTokenMaxAgeMs(): number {
        return this.parseDurationToMilliseconds(
            this.configService.getOrThrow<string>('auth.refreshExpiresIn'),
        );
    }

    private parseDurationToMilliseconds(duration: string): number {
        const trimmedDuration = duration.trim();

        if (/^\d+$/.test(trimmedDuration)) {
            return Number(trimmedDuration) * 1000;
        }

        const match = trimmedDuration.match(/^(\d+)(ms|s|m|h|d)$/);

        if (!match) {
            throw new BadRequestException('Invalid token expiration configuration');
        }

        const amount = Number(match[1]);
        const unit = match[2];

        const multipliers: Record<string, number> = {
            ms: 1,
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return amount * multipliers[unit];
    }

    private getRefreshTokenFromRequest(request: AuthRequest): string {
        const refreshToken = request.cookies?.[AUTH_REFRESH_COOKIE_NAME];

        if (!refreshToken) {
            throw new UnauthorizedException('Invalid authentication token');
        }

        return refreshToken;
    }

    private getUserAgent(request: AuthRequest): string | undefined {
        const userAgent = request.headers['user-agent'];

        if (Array.isArray(userAgent)) {
            return userAgent[0];
        }

        return userAgent;
    }

    private isProduction(): boolean {
        return this.configService.get<string>('app.environment') === 'production';
    }

    private handleUnexpectedError(error: unknown): never {
        if (error instanceof HttpException) {
            throw error;
        }

        throw new InternalServerErrorException('Authentication failed');
    }
}
