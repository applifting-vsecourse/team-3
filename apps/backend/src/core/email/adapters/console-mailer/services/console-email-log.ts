/**
 * What ConsoleMailerAdapter writes to the log. Outside production the whole
 * e-mail, so a developer can click the link. In production only the recipient
 * and the subject: the verification and password-reset links in the body
 * would let anyone who reads the log take over the account (N-6, audit #172).
 */
export const consoleEmailLog = (
  email: { to: string; subject: string; html: string },
  nodeEnv: string | undefined,
): string => {
  const head = `To: ${email.to}\nSubject: ${email.subject}`;
  if (nodeEnv === 'production') {
    return `====== Email Sent ======\n${head}\n(body not logged in production)\n========================`;
  }
  return `====== Email Sent ======\n${head}\nhtml:\n${email.html}\n========================`;
};
