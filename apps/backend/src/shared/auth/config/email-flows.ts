import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { ResetPassword } from '@/core/email/templates/reset-password';
import { VerifyEmail } from '@/core/email/templates/verify-email';
import { Config } from '@/shared/config/config.service';
import type { BetterAuthOptions } from 'better-auth/types';

/** How long the link in the verification e-mail works (B-011: 24 hours). */
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
/** How long a password-reset link works. */
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

export type EmailFlowOptions = {
  emailAndPassword: NonNullable<BetterAuthOptions['emailAndPassword']>;
  emailVerification: NonNullable<BetterAuthOptions['emailVerification']>;
};

/** E-mail verification and password reset: the links and the e-mails with them. */
export const emailFlowOptions = (
  config: Config,
  emailProvider: EmailService,
): EmailFlowOptions => ({
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_SECONDS,
    // a forgotten password is often reset because the account is at risk:
    // the new password signs out every other session
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }): Promise<void> => {
      const passwordResetUrl = `${config.frontendUrl}/${config.frontendResetPasswordUrl}?token=${token}`;
      const html = await renderEmail(ResetPassword, {
        username: user.name,
        url: passwordResetUrl,
      });
      await emailProvider.sendEmail(user.email, 'Password reset', html);
    },
  },
  emailVerification: {
    expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }): Promise<void> => {
      const html = await renderEmail(VerifyEmail, { url });
      await emailProvider.sendEmail(
        user.email,
        'Verify your email address',
        html,
      );
    },
  },
});

/**
 * The core config with the e-mail flows added. The flows are merged in last:
 * the core config used to be spread after them and replaced
 * `emailAndPassword`, which silently dropped `sendResetPassword`.
 */
export const withEmailFlows = <T extends BetterAuthOptions>(
  core: T,
  flows: EmailFlowOptions,
): T & EmailFlowOptions => ({
  ...core,
  emailAndPassword: { ...core.emailAndPassword, ...flows.emailAndPassword },
  emailVerification: { ...core.emailVerification, ...flows.emailVerification },
});
