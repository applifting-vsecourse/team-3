import { Config } from '@/shared/config/config.service';
import { SignInProvidersController } from './sign-in-providers.controller';

const controllerWith = (env: Partial<Config>): SignInProvidersController =>
  new SignInProvidersController(env as Config);

describe('GET /api/sign-in-providers (#154)', () => {
  it('offers Google once both of its variables are set', () => {
    expect(
      controllerWith({
        googleClientId: 'id.apps.googleusercontent.com',
        googleClientSecret: 'secret',
      }).get(),
    ).toEqual({ google: true });
  });

  it('offers nothing but e-mail without them — staging today', () => {
    expect(controllerWith({}).get()).toEqual({ google: false });
    expect(
      controllerWith({ googleClientId: 'id.apps.googleusercontent.com' }).get(),
    ).toEqual({ google: false });
  });

  it('never tells the client the secret', () => {
    const body = controllerWith({
      googleClientId: 'id.apps.googleusercontent.com',
      googleClientSecret: 'secret',
    }).get();

    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('googleusercontent');
  });
});
