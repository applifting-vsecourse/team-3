import * as sharp from 'sharp';
import {
  IMAGE_MAX_PIXELS,
  IMAGE_MAX_SIDE,
  IMAGE_SMALL_SIDE,
  resizeImage,
} from './resize-image';
import { IMAGE_MESSAGES, prepareImage } from './uploaded-image';

const anImage = async (
  width: number,
  height: number,
  format: 'jpeg' | 'png' = 'jpeg',
  withGps = false,
): Promise<Uint8Array> => {
  let image = sharp({
    create: { width, height, channels: 3, background: '#3a7' },
  });
  if (withGps) {
    image = image.withExif({
      IFD0: { Make: 'Fotak' },
      IFD3: { GPSLatitude: '50/1 5/1 0/1', GPSLatitudeRef: 'N' },
    });
  }
  return new Uint8Array(
    await (format === 'jpeg' ? image.jpeg() : image.png()).toBuffer(),
  );
};

describe('resizeImage (#77)', () => {
  it('a big photo becomes WebP at most 1600 px, with a 480 px variant for the cards', async () => {
    const resized = await resizeImage(await anImage(4000, 3000));
    if (typeof resized === 'string') throw new Error(resized);

    const full = await sharp(resized.data).metadata();
    const small = await sharp(resized.small).metadata();
    expect(full).toMatchObject({
      format: 'webp',
      width: IMAGE_MAX_SIDE,
      height: 1200,
    });
    expect(small).toMatchObject({
      format: 'webp',
      width: IMAGE_SMALL_SIDE,
      height: 360,
    });
  });

  it('a portrait keeps its shape: the longer side is the height', async () => {
    const resized = await resizeImage(await anImage(1000, 2000, 'png'));
    if (typeof resized === 'string') throw new Error(resized);

    expect(await sharp(resized.data).metadata()).toMatchObject({
      width: 800,
      height: IMAGE_MAX_SIDE,
    });
  });

  it('a small image is not enlarged', async () => {
    const resized = await resizeImage(await anImage(300, 200));
    if (typeof resized === 'string') throw new Error(resized);

    expect(await sharp(resized.data).metadata()).toMatchObject({
      width: 300,
      height: 200,
    });
    expect(await sharp(resized.small).metadata()).toMatchObject({
      width: 300,
      height: 200,
    });
  });

  it("the camera's metadata, a GPS position included, is not stored", async () => {
    const original = await anImage(800, 600, 'jpeg', true);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const resized = await resizeImage(original);
    if (typeof resized === 'string') throw new Error(resized);

    expect((await sharp(resized.data).metadata()).exif).toBeUndefined();
    expect((await sharp(resized.small).metadata()).exif).toBeUndefined();
  });

  it('more pixels than the limit is refused before decoding', async () => {
    // a plain PNG compresses to little, whatever its size in pixels
    const huge = await anImage(
      8000,
      Math.ceil(IMAGE_MAX_PIXELS / 8000) + 1,
      'png',
    );

    await expect(resizeImage(huge)).resolves.toBe('tooLarge');
  });

  it("a file with an image's first bytes and nothing after them is unreadable", async () => {
    const png = await anImage(10, 10, 'png');

    await expect(resizeImage(png.slice(0, 40))).resolves.toBe('unreadable');
  });
});

describe('prepareImage (#77)', () => {
  it('checks the file, then resizes it to WebP', async () => {
    const result = await prepareImage(await anImage(2000, 1000));

    expect(result).toMatchObject({
      ok: true,
      image: { contentType: 'image/webp' },
    });
  });

  it.each([
    ['nothing', undefined, IMAGE_MESSAGES.missing],
    ['a GIF', new TextEncoder().encode('GIF89a'), IMAGE_MESSAGES.wrongType],
  ])('refuses %s with the Czech reason', async (_name, file, message) => {
    await expect(prepareImage(file)).resolves.toEqual({ ok: false, message });
  });

  it('a broken image is refused as no usable file', async () => {
    const png = await anImage(10, 10, 'png');

    await expect(prepareImage(png.slice(0, 40))).resolves.toEqual({
      ok: false,
      message: IMAGE_MESSAGES.wrongType,
    });
  });

  it('too many pixels says so in Czech', async () => {
    const huge = await anImage(
      8000,
      Math.ceil(IMAGE_MAX_PIXELS / 8000) + 1,
      'png',
    );

    await expect(prepareImage(huge)).resolves.toEqual({
      ok: false,
      message: IMAGE_MESSAGES.tooLarge,
    });
  });
});
