import type { Config } from '@/shared/config/config.service';
import { WelcomeController } from './welcome.controller';

const welcome = (
  config: Partial<Config>,
): ReturnType<WelcomeController['getWelcomeMessage']> =>
  new WelcomeController({
    name: 'HobbyHub backend',
    description: '',
    version: '0.1.0',
    ...config,
  } as Config).getWelcomeMessage();

describe('WelcomeController: links to the API docs (N-9)', () => {
  it('lists them outside production', async () => {
    await expect(welcome({ nodeEnv: 'development' })).resolves.toMatchObject({
      swaggerDocs: '/api/docs',
      authEndpointsDocs: '/api/auth/reference',
    });
  });

  it('leaves them out in production without API_DOCS=true, where they are 404', async () => {
    const message = await welcome({ nodeEnv: 'production' });

    expect(message).not.toHaveProperty('swaggerDocs');
    expect(message).not.toHaveProperty('authEndpointsDocs');
    expect(message.healthCheck).toBe('/api/health');
  });

  it('lists them in production with API_DOCS=true (staging)', async () => {
    await expect(
      welcome({ nodeEnv: 'production', apiDocs: 'true' }),
    ).resolves.toMatchObject({
      swaggerDocs: '/api/docs',
      authEndpointsDocs: '/api/auth/reference',
    });
  });
});
