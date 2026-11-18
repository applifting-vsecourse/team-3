import * as sharp from 'sharp';

/** The stored image's longer side: enough for the detail on a wide screen (760 px at 2×). */
export const IMAGE_MAX_SIDE = 1600;
/** The small variant's longer side: a card's photo (104–400 px) on a phone at 2×. */
export const IMAGE_SMALL_SIDE = 480;
/**
 * More pixels than this is refused before decoding: a 5 MB PNG can still be
 * tens of thousands of pixels wide and take gigabytes to decode.
 */
export const IMAGE_MAX_PIXELS = 40_000_000;

export type ResizedImage = { data: Uint8Array; small: Uint8Array };

const toWebp = (
  input: Uint8Array,
  side: number,
  quality: number,
): Promise<Buffer> =>
  sharp(input, { limitInputPixels: IMAGE_MAX_PIXELS })
    // the camera's orientation, then the EXIF goes (with it any GPS position)
    .rotate()
    .resize({
      width: side,
      height: side,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

/**
 * The upload as it is stored (#77): WebP, the longer side at most 1600 px,
 * and a small variant for the cards. Metadata is dropped. `tooLarge` for an
 * image with too many pixels, `unreadable` for a file that only looks like
 * an image (its first bytes are right, the rest isn't).
 */
export async function resizeImage(
  bytes: Uint8Array,
): Promise<ResizedImage | 'tooLarge' | 'unreadable'> {
  try {
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) return 'unreadable';
    if (width * height > IMAGE_MAX_PIXELS) return 'tooLarge';
    const [data, small] = await Promise.all([
      toWebp(bytes, IMAGE_MAX_SIDE, 80),
      toWebp(bytes, IMAGE_SMALL_SIDE, 75),
    ]);
    return { data: new Uint8Array(data), small: new Uint8Array(small) };
  } catch {
    return 'unreadable';
  }
}
