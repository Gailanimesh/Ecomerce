import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from './../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/users/entities/role.entity';
import { Session } from '../src/modules/auth/entities/session.entity';
import { RoleEnum } from '../src/common/enums/roles.enum';

describe('Authentication Module (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let sessionRepository: Repository<Session>;

  const testUser = {
    email: 'test_user@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = app.get<Repository<Role>>(getRepositoryToken(Role));
    sessionRepository = app.get<Repository<Session>>(getRepositoryToken(Session));

    // Cleanup any existing test user from previous runs
    await userRepository.delete({ email: testUser.email.toLowerCase() });
  });

  afterAll(async () => {
    // Final cleanup of the test user
    if (userRepository) {
      await userRepository.delete({ email: testUser.email.toLowerCase() });
    }
    await app.close();
  });

  describe('Flow: Register, Login, Refresh, Logout, Logout-All & RBAC', () => {
    let accessTokenA: string;
    let cookieA: string;
    let accessTokenB: string;
    let cookieB: string;
    let loggedInUserId: string;

    it('should register a new user as CUSTOMER', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email.toLowerCase());
      expect(response.body.user).toHaveProperty('role', RoleEnum.CUSTOMER);
      loggedInUserId = response.body.user.id;
    });

    it('should login on Device A (Session A)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      accessTokenA = response.body.accessToken;

      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();
      const cookie = setCookieHeaders.find((c: string) => c.startsWith('refreshToken='));
      expect(cookie).toBeDefined();
      cookieA = cookie;
    });

    it('should login on Device B (Session B)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      accessTokenB = response.body.accessToken;

      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();
      const cookie = setCookieHeaders.find((c: string) => c.startsWith('refreshToken='));
      expect(cookie).toBeDefined();
      cookieB = cookie;
    });

    it('should fetch user profile (/api/v1/auth/me) with access tokens showing separate sessionIds', async () => {
      const meResponseA = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(200);

      expect(meResponseA.body).toHaveProperty('email', testUser.email.toLowerCase());
      expect(meResponseA.body).toHaveProperty('sessionId');
      expect(meResponseA.body).toHaveProperty('role', RoleEnum.CUSTOMER);

      const meResponseB = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessTokenB}`)
        .expect(200);

      expect(meResponseB.body).toHaveProperty('email', testUser.email.toLowerCase());
      expect(meResponseB.body).toHaveProperty('sessionId');
      expect(meResponseB.body).toHaveProperty('role', RoleEnum.CUSTOMER);

      expect(meResponseA.body.sessionId).not.toEqual(meResponseB.body.sessionId);
    });

    it('should refresh access token on Device A using refresh token A', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieA)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      // Update with new access token
      accessTokenA = response.body.accessToken;
    });

    it('should deny GET /api/v1/auth/admin-test with CUSTOMER role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/admin-test')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(403);
    });

    it('should logout Session A (Device A) and clear refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieA)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();
      const clearedCookie = setCookieHeaders.find((c: string) => c.startsWith('refreshToken=;'));
      expect(clearedCookie).toBeDefined();
    });

    it('should fail to refresh access token on Device A after logging out', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieA)
        .expect(401);
    });

    it('should keep Device B logged in and allow refresh on Device B', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieB)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      accessTokenB = response.body.accessToken;
    });

    it('should fail logout if refresh cookie is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should login on Device A again to establish two active sessions again', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      accessTokenA = response.body.accessToken;
      const setCookieHeaders = response.headers['set-cookie'];
      const cookie = setCookieHeaders.find((c: string) => c.startsWith('refreshToken='));
      cookieA = cookie;
    });

    it('should logout all devices from Device A', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Logged out from all devices successfully');

      // Refresh should fail on both devices
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieA)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieB)
        .expect(401);
    });

    it('should allow GET /api/v1/auth/admin-test with ADMIN role', async () => {
      // Temporarily elevate user role to ADMIN
      const adminRole = await roleRepository.findOne({ where: { name: RoleEnum.ADMIN } })
        || await roleRepository.save(roleRepository.create({ name: RoleEnum.ADMIN }));

      await userRepository.update({ id: loggedInUserId }, { role: adminRole });

      // Log in again to get fresh tokens with ADMIN role
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      const adminAccessToken = response.body.accessToken;

      const adminTestResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/admin-test')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminTestResponse.body).toHaveProperty('message', 'Admin access granted');
    });
  });
});
