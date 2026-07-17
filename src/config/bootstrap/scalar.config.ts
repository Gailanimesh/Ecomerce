import { INestApplication } from '@nestjs/common';
import { apiReference } from '@scalar/nestjs-api-reference';

export function configureScalar(
  app: INestApplication,
  document: object,
) {
  app.use(
    '/reference',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );
}