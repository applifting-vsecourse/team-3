import type { Config } from '@/shared/config/config.service';
import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

/**
 * The OpenAPI document behind Swagger. Its paths already carry the global
 * prefix (/api/events), so no addServer('/api'): with it „Try it out“ called
 * /api/api/events and got 404 (#229). Without a server Swagger UI calls the
 * origin it was loaded from.
 */
export const createApiDocument = (
  app: INestApplication,
  config: Pick<Config, 'name' | 'description' | 'version'>,
): OpenAPIObject =>
  SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(config.name)
      .setDescription(config.description)
      .setVersion(config.version)
      .addCookieAuth('better-auth.session_token')
      .build(),
  );

/** Swagger at /api/docs. Call after app.setGlobalPrefix('api'). */
export const setupApiDocs = (
  app: INestApplication,
  config: Pick<Config, 'name' | 'description' | 'version'>,
): void => {
  SwaggerModule.setup('api/docs', app, createApiDocument(app, config));
};
