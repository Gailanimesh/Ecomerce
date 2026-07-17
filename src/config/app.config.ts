import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Ecommerce API',

  version: process.env.APP_VERSION ?? '1.0.0',

  port: parseInt(process.env.PORT ?? '3000', 10),

  environment: process.env.NODE_ENV ?? 'development',
}));