/**
 * The link preview of `/pozvanka/:code` (#475): what WhatsApp, Messenger, iMessage and the
 * like show when someone shares their invite. Crawlers run no JavaScript, so nginx sends them
 * here and this small page carries the Open Graph tags; a person who lands here goes on to the
 * SPA by the meta refresh or the link. No script, so nothing for a CSP to allow.
 *
 * Only the first name (GDPR art. 5(1)(c), data minimisation): previews stay cached at Meta and
 * Apple after the name changes or the account goes. A bad, replaced or blocked inviter's code
 * gets the same page with the generic title, so the page tells nothing more than the SPA does.
 */
import { INVITE_CODE_PATTERN } from '@/modules/friendship/domain/invite';

export const INVITE_PREVIEW_GENERIC_TITLE = 'Pozvánka na HobbyHub';
export const INVITE_PREVIEW_DESCRIPTION =
  'Najdi akce a lidi na koníčky ve svém okolí.';
/** The static picture from the frontend's `public/` (1200 × 630). */
export const INVITE_PREVIEW_IMAGE_PATH = '/og-hobbyhub.png';
const FIRST_NAME_MAX = 30;

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The first word of the name, at most 30 characters, or null for an empty one. */
export const firstNameOf = (name: string): string | null => {
  const [first] = name.trim().split(/\s+/u);
  if (!first) return null;
  return Array.from(first).slice(0, FIRST_NAME_MAX).join('');
};

export const invitePreviewTitle = (inviterName: string | null): string => {
  const firstName = inviterName === null ? null : firstNameOf(inviterName);
  return firstName
    ? `${firstName} tě zve na HobbyHub`
    : INVITE_PREVIEW_GENERIC_TITLE;
};

export type InvitePreviewInput = {
  code: string;
  /** The inviter's name, or null when the code leads to no one. */
  inviterName: string | null;
  /** The configured origins, never the request's Host. */
  frontendUrl: string;
  backendUrl: string;
};

export const invitePreviewHtml = ({
  code,
  inviterName,
  frontendUrl,
  backendUrl,
}: InvitePreviewInput): string => {
  // a malformed code never goes back into the page: it leads to the home page instead
  const isWellFormed = INVITE_CODE_PATTERN.test(code);
  const target = new URL(
    isWellFormed ? `/pozvanka/${code}` : '/',
    frontendUrl,
  ).toString();
  const self = isWellFormed
    ? new URL(`/api/invites/${code}/preview`, backendUrl).toString()
    : target;
  const image = new URL(INVITE_PREVIEW_IMAGE_PATH, frontendUrl).toString();
  const title = escapeHtml(
    invitePreviewTitle(isWellFormed ? inviterName : null),
  );
  const description = escapeHtml(INVITE_PREVIEW_DESCRIPTION);
  const to = escapeHtml(target);

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="noindex" />
    <meta property="og:site_name" content="HobbyHub" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="cs_CZ" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(self)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Logo HobbyHub na zeleném pozadí" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta http-equiv="refresh" content="0;url=${to}" />
  </head>
  <body>
    <p><a href="${to}">Pokračovat na HobbyHub</a></p>
  </body>
</html>
`;
};
