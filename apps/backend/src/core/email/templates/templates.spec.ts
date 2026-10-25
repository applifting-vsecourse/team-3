import { text } from 'node:stream/consumers';
import * as React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { ResetPassword } from './reset-password';
import { VerifyEmail } from './verify-email';

// What the user reads: Czech with „ty“ like the app (DESIGN.md › Copy), the link
// both as the button and as text, and the brand colour on the button.
// react-email's own render imports react-dom dynamically, which jest can't
// without --experimental-vm-modules; prerendering the same tree waits for its
// Tailwind the same way.
const markup = async <TProps extends object>(
  Component: React.ComponentType<TProps>,
  props: TProps,
): Promise<string> => {
  const { prelude } = await prerenderToNodeStream(
    React.createElement(Component, props),
  );
  return text(prelude);
};

describe('account e-mails', () => {
  it('the verification e-mail is Czech and carries the link', async () => {
    const html = await markup(VerifyEmail, {
      url: 'https://api.example/verify?token=abc',
    });

    expect(html).toContain('<html dir="ltr" lang="cs">');
    expect(html).not.toContain('lang="en"');
    expect(html).toContain('Vítej v HobbyHubu');
    expect(html).toContain('Ověřit e-mail');
    expect(html).toContain('Platí 24 hodin.');
    expect(
      html.match(/https:\/\/api\.example\/verify\?token=abc/g),
    ).toHaveLength(2);
    // --primary (#b6f24a) as Tailwind inlines it
    expect(html).toContain('background-color:rgb(182,242,74)');
    expect(html).not.toMatch(/Verify|Welcome/);
  });

  it('the reset e-mail is Czech and carries the link', async () => {
    const html = await markup(ResetPassword, {
      url: 'https://hobbyhub.example/reset-password?token=t0k3n',
    });

    expect(html).toContain('<html dir="ltr" lang="cs">');
    expect(html).not.toContain('lang="en"');
    expect(html).toContain('Ahoj, přišla nám žádost o nové heslo');
    expect(html).toContain('Nastavit nové heslo');
    expect(html).toContain('Platí hodinu.');
    expect(
      html.match(/https:\/\/hobbyhub\.example\/reset-password\?token=t0k3n/g),
    ).toHaveLength(2);
    expect(html).toContain('background-color:rgb(182,242,74)');
    expect(html).not.toMatch(/Reset your password|Hi /);
  });
});
