import {
  checkImageFile,
  detectImageType,
  IMAGE_MAX_BYTES,
  IMAGE_MESSAGES,
} from './uploaded-image';

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

describe('checkImageFile', () => {
  it('accepts an image up to 5 MB and says what it is', () => {
    const file = new Uint8Array(IMAGE_MAX_BYTES);
    file.set(PNG);

    expect(checkImageFile(file)).toEqual({
      ok: true,
      image: { contentType: 'image/png', data: file },
    });
  });

  it('refuses one byte over 5 MB', () => {
    const file = new Uint8Array(IMAGE_MAX_BYTES + 1);
    file.set(JPEG);

    expect(checkImageFile(file)).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.tooBig,
    });
  });

  it('refuses a file that is not JPEG, PNG or WebP and says why', () => {
    expect(checkImageFile(text('GIF89a'))).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.wrongType,
    });
  });

  it('asks for a file when none came', () => {
    expect(checkImageFile(undefined)).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.missing,
    });
    expect(checkImageFile(bytes())).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.missing,
    });
  });
});
