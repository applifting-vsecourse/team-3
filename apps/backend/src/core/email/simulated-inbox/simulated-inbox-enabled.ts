import type { Config } from '@/shared/config/config.service';

type InboxEnv = Pick<
  Config,
  | 'resendApiKey'
  | 'smtpHost'
  | 'smtpUsername'
  | 'smtpPassword'
  | 'simulatedInbox'
  | 'nodeEnv'
>;

const usesConsoleMailer = (config: InboxEnv): boolean =>
  !config.resendApiKey &&
  !(config.smtpHost && config.smtpUsername && config.smtpPassword);

/**
 * The simulated inbox shows a verification link to whoever signed up, so an
 * address counts as verified without its owner. Never next to a real e-mail
 * service; in production only with SIMULATED_INBOX=true (staging sets it in
 * Dockerfile.deploy), so a missing mail key can't turn it on by accident.
 */
export const simulatedInboxEnabled = (config: InboxEnv): boolean => {
  if (!usesConsoleMailer(config)) return false;
  const setting = config.simulatedInbox?.trim().toLowerCase();
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  return config.nodeEnv !== 'production';
};
