import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { Config } from '@/shared/config/config.service';
import { mock } from 'jest-mock-extended';
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  emailFlowOptions,
  PASSWORD_RESET_TTL_SECONDS,
  withEmailFlows,
} from './email-flows';

// The React Email templates are replaced: rendering them isn't what's tested.
jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn(
    async (_template: unknown, props: { url: string }) =>
      `<a href="${props.url}">`,
  ),
}));
jest.mock('@/core/email/templates/reset-password', () => ({
  ResetPassword: 'ResetPassword',
}));
jest.mock('@/core/email/templates/verify-email', () => ({
  VerifyEmail: 'VerifyEmail',
}));

const config = {
  frontendUrl: 'https://hobbyhub.example',
  frontendResetPasswordUrl: 'reset-password',
} as Config;

const user = { id: 'u1', name: 'Jakub', email: 'jakub@example.com' } as never;

describe('emailFlowOptions', () => {
  it('the verification link works for 24 hours and is sent on sign-up', () => {
    const { emailVerification } = emailFlowOptions(
      config,
      mock<EmailService>(),
    );

    expect(emailVerification.expiresIn).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
    expect(EMAIL_VERIFICATION_TTL_SECONDS).toBe(86_400);
    expect(emailVerification.sendOnSignUp).toBe(true);
  });

  it('the reset e-mail links to the frontend page with the token, for a limited time', async () => {
    const email = mock<EmailService>();
    const { emailAndPassword } = emailFlowOptions(config, email);

    expect(emailAndPassword.resetPasswordTokenExpiresIn).toBe(
      PASSWORD_RESET_TTL_SECONDS,
    );
    expect(emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
    await emailAndPassword.sendResetPassword!(
      { user, url: 'ignored', token: 't0k3n' },
      undefined,
    );
    expect(email.sendEmail).toHaveBeenCalledWith(
      'jakub@example.com',
      expect.any(String),
      expect.stringContaining(
        'https://hobbyhub.example/reset-password?token=t0k3n',
      ),
    );
  });

  it('the verification e-mail carries the link BetterAuth made', async () => {
    const email = mock<EmailService>();
    const { emailVerification } = emailFlowOptions(config, email);

    await emailVerification.sendVerificationEmail!(
      { user, url: 'https://api.example/verify?token=abc', token: 'abc' },
      undefined,
    );
    expect(email.sendEmail).toHaveBeenCalledWith(
      'jakub@example.com',
      expect.any(String),
      expect.stringContaining('https://api.example/verify?token=abc'),
    );
  });
});

describe('withEmailFlows', () => {
  it('keeps the reset e-mail and the rest of the core config', () => {
    const core = {
      emailAndPassword: { enabled: true },
      user: { additionalFields: { role: { type: 'string' as const } } },
    };
    const flows = emailFlowOptions(config, mock<EmailService>());

    const options = withEmailFlows(core, flows);

    expect(options.emailAndPassword.sendResetPassword).toBe(
      flows.emailAndPassword.sendResetPassword,
    );
    expect(options.emailAndPassword.enabled).toBe(true);
    expect(options.emailVerification.expiresIn).toBe(86_400);
    expect(options.user).toBe(core.user);
  });
});
