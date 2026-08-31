import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { configureSwagger } from './src/config/bootstrap/swagger.config';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    
    // We might need to call enableVersioning if endpoints use it
    const { VersioningType } = require('@nestjs/common');
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    const document = configureSwagger(app);
    const outPath = 'C:\\Users\\Preema Animesh\\.gemini\\antigravity-ide\\brain\\1febf2cc-bdf0-4d3f-b978-2c43a7d6f55d\\scratch\\api-docs.json';
    fs.writeFileSync(outPath, JSON.stringify(document, null, 2));
    
    await app.close();
    console.log('Swagger JSON generated successfully at', outPath);
  } catch (err) {
    console.error('Error generating docs:', err);
    process.exit(1);
  }
}
generate();
