import { text } from 'node:stream/consumers';
import * as React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { EventNotificationEmail } from './event-notification';
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

describe('the shared layout (B-040)', () => {
  it('frames every e-mail with the brand on top and a footer', async () => {
    const html = [
      await markup(VerifyEmail, { url: 'https://api.example/verify' }),
      await markup(ResetPassword, { url: 'https://hobbyhub.example/reset' }),
      await markup(EventNotificationEmail, notification()),
    ];

    for (const mail of html) {
      expect(mail).toContain('>HobbyHub</p>');
      expect(mail).toContain('Tenhle e-mail ti poslal HobbyHub.');
      expect(mail).toContain('<html dir="ltr" lang="cs">');
    }
  });
});

const notification = (
  overrides: Partial<Parameters<typeof EventNotificationEmail>[0]> = {},
): Parameters<typeof EventNotificationEmail>[0] => ({
  preview: 'Akce „Deskovky ve středu“ byla zrušena.',
  heading: 'Akce byla zrušena',
  paragraphs: ['Akce „Deskovky ve středu“ byla zrušena.'],
  details: [{ label: 'Termín', value: 'st 11. 11. 2026 v 18:00' }],
  quote: { label: 'Důvod zrušení', text: 'Herna má zavřeno.' },
  action: { label: 'Zobrazit akci', url: 'https://hobbyhub.example/akce/e1' },
  ...overrides,
});

describe('the e-mail about an event (#177)', () => {
  it('is Czech, has the button and the same link as text, and the brand colour', async () => {
    const html = await markup(EventNotificationEmail, notification());

    expect(html).toContain('lang="cs"');
    expect(html).toContain('Akce byla zrušena');
    expect(html).toContain('Zobrazit akci');
    expect(html).toContain('<strong>Termín:</strong>');
    expect(html).toContain('st 11. 11. 2026 v 18:00');
    expect(html.match(/https:\/\/hobbyhub\.example\/akce\/e1/g)).toHaveLength(
      2,
    );
    expect(html).toContain('background-color:rgb(182,242,74)');
  });

  it('quotes what somebody wrote, escaped, and leaves the box out without it', async () => {
    const withQuote = await markup(
      EventNotificationEmail,
      notification({
        quote: {
          label: 'Zpráva k žádosti',
          text: '<script>alert(1)</script> Ahoj',
        },
      }),
    );
    const without = await markup(
      EventNotificationEmail,
      notification({ quote: null }),
    );

    expect(withQuote).toContain('Zpráva k žádosti');
    expect(withQuote).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Ahoj');
    expect(withQuote).not.toContain('<script>');
    expect(without).not.toContain('Důvod zrušení');
  });
});
