import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { Config } from '@/shared/config/config.service';
import { SignInProvidersController } from './sign-in-providers.controller';

const controllerWith = (
  env: Partial<Config>,
  inbox: SimulatedInbox | null = null,
): SignInProvidersController =>
  new SignInProvidersController(env as Config, inbox);

describe('GET /api/sign-in-providers (#154)', () => {
  it('offers Google once both of its variables are set', () => {
    expect(
      controllerWith({
        googleClientId: 'id.apps.googleusercontent.com',
        googleClientSecret: 'secret',
      }).get(),
    ).toEqual({ google: true, simulatedInbox: false });
  });

  it('offers nothing but e-mail without them — staging today', () => {
    expect(controllerWith({}).get()).toMatchObject({ google: false });
    expect(
      controllerWith({ googleClientId: 'id.apps.googleusercontent.com' }).get(),
    ).toMatchObject({ google: false });
  });

  it('says whether e-mails are simulated (#236), the same for everyone', () => {
    expect(controllerWith({}).get().simulatedInbox).toBe(false);
    expect(
      controllerWith({}, new SimulatedInbox('Ověř si e-mail')).get()
        .simulatedInbox,
    ).toBe(true);
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
