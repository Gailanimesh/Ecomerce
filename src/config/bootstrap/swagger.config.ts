import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('E-Commerce Backend API')
    .setDescription(
      'Production-style NestJS E-Commerce Backend REST API documentation. Provides complete specification for Authentication, User Management, Product Catalog (Categories, Brands, Products, Variants, Media), and System Health.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer JWT Access Token',
        in: 'header',
      },
    )
    .addTag('Authentication', 'User registration, login, token rotation, session management, and profile access')
    .addTag('Catalog', 'Product catalog management including Categories, Brands, Products, Variants, and Media')
    .addTag('Health', 'System health checks and operational monitoring')
    .addTag('Inventory', 'Inventory stock tracking and management')
    .addTag('Users', 'User profile and account administration')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  return document;
}