import { apiDocsEnabled } from './api-docs-enabled';

describe('apiDocsEnabled', () => {
  it('is on outside production unless switched off', () => {
    expect(apiDocsEnabled({})).toBe(true);
    expect(apiDocsEnabled({ nodeEnv: 'development' })).toBe(true);
    expect(apiDocsEnabled({ nodeEnv: 'test' })).toBe(true);
    expect(apiDocsEnabled({ apiDocs: 'false' })).toBe(false);
  });

  it('in production needs API_DOCS=true', () => {
    expect(apiDocsEnabled({ nodeEnv: 'production' })).toBe(false);
    expect(apiDocsEnabled({ nodeEnv: 'production', apiDocs: '' })).toBe(false);
    expect(apiDocsEnabled({ nodeEnv: 'production', apiDocs: 'false' })).toBe(
      false,
    );
    expect(apiDocsEnabled({ nodeEnv: 'production', apiDocs: 'true' })).toBe(
      true,
    );
    expect(apiDocsEnabled({ nodeEnv: 'production', apiDocs: ' TRUE ' })).toBe(
      true,
    );
  });
});
