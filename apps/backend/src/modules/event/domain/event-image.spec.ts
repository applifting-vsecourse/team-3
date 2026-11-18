import {
  checkEventImage,
  detectImageType,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_MESSAGES,
} from './event-image';

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);
const text = (value: string): Uint8Array => new TextEncoder().encode(value);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const WEBP = text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ');

describe('detectImageType', () => {
  it.each([
    ['JPEG', JPEG, 'image/jpeg'],
    ['PNG', PNG, 'image/png'],
    ['WebP', WEBP, 'image/webp'],
  ])('knows %s by its first bytes', (_name, file, type) => {
    expect(detectImageType(file)).toBe(type);
  });

  it.each([
    ['an SVG', text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ['an HTML page', text('<!doctype html><script>alert(1)</script>')],
    ['a GIF', text('GIF89a')],
    ['a PDF', text('%PDF-1.7')],
    [
      'a RIFF that is not WebP (WAV)',
      text('RIFF\u0000\u0000\u0000\u0000WAVEfmt '),
    ],
    ['a cut-off PNG signature', bytes(0x89, 0x50, 0x4e, 0x47)],
    ['nothing', bytes()],
  ])('refuses %s', (_name, file) => {
    expect(detectImageType(file)).toBeNull();
  });
});

describe('checkEventImage', () => {
  it('accepts an image up to 5 MB and says what it is', () => {
    const file = new Uint8Array(EVENT_IMAGE_MAX_BYTES);
    file.set(PNG);

    expect(checkEventImage(file)).toEqual({
      ok: true,
      contentType: 'image/png',
    });
  });

  it('refuses one byte over 5 MB', () => {
    const file = new Uint8Array(EVENT_IMAGE_MAX_BYTES + 1);
    file.set(JPEG);

    expect(checkEventImage(file)).toEqual({
      ok: false,
      message: EVENT_IMAGE_MESSAGES.tooBig,
    });
  });

  it('refuses a file that is not JPEG, PNG or WebP and says why', () => {
    expect(checkEventImage(text('GIF89a'))).toEqual({
      ok: false,
      message: EVENT_IMAGE_MESSAGES.wrongType,
    });
  });

  it('asks for a file when none came', () => {
    expect(checkEventImage(undefined)).toEqual({
      ok: false,
      message: EVENT_IMAGE_MESSAGES.missing,
    });
    expect(checkEventImage(bytes())).toEqual({
      ok: false,
      message: EVENT_IMAGE_MESSAGES.missing,
    });
  });
});
