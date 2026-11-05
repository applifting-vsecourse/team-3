import type { Config } from '@/shared/config/config.service';

type ApiDocsEnv = Pick<Config, 'apiDocs' | 'nodeEnv'>;

/**
 * Swagger (/api/docs) and BetterAuth's reference page (/api/auth/reference)
 * describe every endpoint and the reference page loads an unpinned script
 * from a CDN (N-9, audit #172). On outside production; in production only
 * with API_DOCS=true (staging sets it in Dockerfile.deploy).
 */
export const apiDocsEnabled = (config: ApiDocsEnv): boolean => {
  const setting = config.apiDocs?.trim().toLowerCase();
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  return config.nodeEnv !== 'production';
};
