import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,

  host: process.env.DB_HOST,

  port: parseInt(process.env.DB_PORT ?? '5432', 10),

  username: process.env.DB_USERNAME,

  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

  synchronize: false, // We'll change this to false once we start migrations.

  autoLoadEntities: true,

  logging: process.env.NODE_ENV === 'development',
}));