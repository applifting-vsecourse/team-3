import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { sameOriginWrites } from './security/same-origin-writes';
import { securityHeaders } from './security/security-headers';

/**
 * The middleware and routing every running API has: CORS, security headers,
 * cookies, BetterAuth at /api/auth/*, same-origin writes, JSON and the /api
 * prefix. main.ts and the main-flow check (#467) share it, so the check runs
 * the app as it is deployed.
 */
export function configureApp(app: INestApplication, config: Config): void {
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
}
