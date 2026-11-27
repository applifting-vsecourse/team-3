import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApiDocs } from './core/api-docs/api-docs';
import { apiDocsEnabled } from './core/api-docs/api-docs-enabled';
import { configureApp } from './core/configure-app';
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

  configureApp(app, config);

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
