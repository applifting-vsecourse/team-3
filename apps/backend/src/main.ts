import { NestFactory } from '@nestjs/core';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { setupApiDocs } from './core/api-docs/api-docs';
import { apiDocsEnabled } from './core/api-docs/api-docs-enabled';
import { sameOriginWrites } from './core/security/same-origin-writes';
import { securityHeaders } from './core/security/security-headers';
import { BetterAuth } from './shared/auth/providers/better-auth.provider';
import { Config } from './shared/config/config.service';

/**
 * Main application entry point
 * Initializes and configures the NestJS application
 */
async function main(): Promise<void> {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Get configuration service
  const config = app.get(Config);

  // Configure CORS - Allows cross-origin requests from specific origins
  app.enableCors({
    origin: [config.backendUrl, config.frontendUrl],
    credentials: true,
  });

  // Before every route, BetterAuth's and the Swagger UI's included
  app.use(securityHeaders());

  // Setup cookie parser middleware
  app.use(cookieParser());

  const appInstance = app.getHttpAdapter().getInstance();
  // request.ip behind the proxy: the address the proxy saw, not a header the client set
  if (config.trustProxyHops > 0) {
    appInstance.set('trust proxy', config.trustProxyHops);
  }
  const betterAuth = app.get<BetterAuth>('BetterAuth');
  // Express 5 (via NestJS 11) requires named wildcards — a bare `*` throws.
  appInstance.all('/api/auth/*splat', toNodeHandler(betterAuth));
  // writes only from our own origins: other apps on the same site send our cookie too
  appInstance.use(sameOriginWrites([config.frontendUrl, config.backendUrl]));
  appInstance.use(express.json());

  // Configure API prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger at /api/docs, off in production unless API_DOCS=true (N-9)
  if (apiDocsEnabled(config)) {
    setupApiDocs(app, config);
  }

  // Print debug information for development purposes
  if (config.nodeEnv !== 'production') {
    console.log('App configuration:', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      backendUrl: config.backendUrl,
      frontendUrl: config.frontendUrl,
    });
  }

  // Start the application
  await app.listen(config.port);
  console.log(`Application is running on: ${config.backendUrl}`);
  // Na stagingu se verze Node ověřuje z logu (CVE-2026-111497, audit #172)
  console.log(
    `Node ${process.version}, commit ${config.gitCommitSha || 'unknown'}`,
  );
}

// Execute the main function
main().catch((error) => console.error('Application error:', error));
