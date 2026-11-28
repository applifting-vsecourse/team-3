import {
  firstNameOf,
  invitePreviewHtml,
  invitePreviewTitle,
} from './invite-preview';

const CODE = 'q3Zr1hXkE0bLw9yT2vNcAa';
const urls = {
  frontendUrl: 'https://hobbyhub.test',
  backendUrl: 'https://hobbyhub.test',
};

const metaOf = (html: string, property: string): string | undefined =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)" />`).exec(
    html,
  )?.[1];

describe('invite link preview (#475)', () => {
  it('names only the first name', () => {
    const html = invitePreviewHtml({
      ...urls,
      code: CODE,
      inviterName: '  Petra   Nová ',
    });

    expect(metaOf(html, 'og:title')).toBe('Petra tě zve na HobbyHub');
    expect(metaOf(html, 'twitter:title')).toBe('Petra tě zve na HobbyHub');
    expect(html).not.toContain('Nová');
  });

  it('cuts a long first name to 30 characters', () => {
    expect(firstNameOf('Á'.repeat(40))).toBe('Á'.repeat(30));
  });

  it('escapes the name, and the page has no script', () => {
    const html = invitePreviewHtml({
      ...urls,
      code: CODE,
      inviterName: '<script>alert("x")</script>',
    });

    expect(html).not.toMatch(/<script/i);
    expect(metaOf(html, 'og:title')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; tě zve na HobbyHub',
    );
  });

  it('a name that breaks out of the attribute stays inside it', () => {
    const html = invitePreviewHtml({
      ...urls,
      code: CODE,
      inviterName: `"/><img src=x onerror=alert(1)>`,
    });

    expect(html).not.toContain('<img');
    expect(html).not.toMatch(/content=""\//);
  });

  it('a code that leads to no one gets the generic title', () => {
    const html = invitePreviewHtml({ ...urls, code: CODE, inviterName: null });

    expect(metaOf(html, 'og:title')).toBe('Pozvánka na HobbyHub');
    expect(invitePreviewTitle('   ')).toBe('Pozvánka na HobbyHub');
  });

  it('has the description, an absolute image and its own address', () => {
    const html = invitePreviewHtml({
      frontendUrl: 'https://app.test',
      backendUrl: 'https://api.test',
      code: CODE,
      inviterName: 'Petra',
    });

    expect(metaOf(html, 'og:description')).toBe(
      'Najdi akce a lidi na koníčky ve svém okolí.',
    );
    expect(metaOf(html, 'og:image')).toBe('https://app.test/og-hobbyhub.png');
    expect(metaOf(html, 'og:image:width')).toBe('1200');
    expect(metaOf(html, 'og:image:height')).toBe('630');
    expect(metaOf(html, 'twitter:card')).toBe('summary_large_image');
    expect(metaOf(html, 'og:url')).toBe(
      `https://api.test/api/invites/${CODE}/preview`,
    );
  });

  it('a person goes on to the invite in the SPA', () => {
    const html = invitePreviewHtml({
      ...urls,
      code: CODE,
      inviterName: 'Petra',
    });

    expect(html).toContain(
      `<meta http-equiv="refresh" content="0;url=https://hobbyhub.test/pozvanka/${CODE}" />`,
    );
    expect(html).toContain(
      `<a href="https://hobbyhub.test/pozvanka/${CODE}">Pokračovat na HobbyHub</a>`,
    );
  });

  it('a malformed code never goes back into the page', () => {
    const html = invitePreviewHtml({
      ...urls,
      code: '"><script>x</script>',
      inviterName: 'Petra',
    });

    expect(html).not.toMatch(/<script/i);
    expect(metaOf(html, 'og:title')).toBe('Pozvánka na HobbyHub');
    expect(html).toContain('content="0;url=https://hobbyhub.test/"');
  });
});
