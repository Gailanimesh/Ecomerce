import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

import { configureSwagger } from './config/bootstrap/swagger.config';
import { configureScalar } from './config/bootstrap/scalar.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const document = configureSwagger(app);

  configureScalar(app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();