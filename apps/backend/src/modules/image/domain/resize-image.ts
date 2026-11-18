import * as sharp from 'sharp';

/**
 * The stored image's width: enough for the detail on a wide screen (760 px at
 * 2×). A width, not the longer side: the frontend's `srcSet` tells the browser
 * these widths (`1600w`, `480w`), and a poster is taller than wide (review #366).
 */
export const IMAGE_MAX_WIDTH = 1600;
/** The small variant's width: a card's photo (72–480 px) at most 480 px wide. */
export const IMAGE_SMALL_WIDTH = 480;
/** A strip taller than 3:1 is cut down in height too, so it doesn't stay megapixels tall. */
const MAX_HEIGHT_RATIO = 3;
/**
 * More pixels than this is refused before decoding: a 5 MB PNG can still be
 * tens of thousands of pixels wide and take gigabytes to decode.
 */
export const IMAGE_MAX_PIXELS = 40_000_000;

export type ResizedImage = { data: Uint8Array; small: Uint8Array };

const toWidth = (width: number): sharp.ResizeOptions => ({
  width,
  height: width * MAX_HEIGHT_RATIO,
  fit: 'inside',
  withoutEnlargement: true,
});

/**
 * The upload as it is stored (#77): WebP at most 1600 px wide, and a small
 * variant 480 px wide for the cards. Metadata is dropped. The original is
 * decoded once; the small variant comes from the stored one, which is cheap.
 * `tooLarge` for an image with too many pixels, `unreadable` for a file that
 * only looks like an image (its first bytes are right, the rest isn't).
 */
export async function resizeImage(
  bytes: Uint8Array,
): Promise<ResizedImage | 'tooLarge' | 'unreadable'> {
  try {
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) return 'unreadable';
    if (width * height > IMAGE_MAX_PIXELS) return 'tooLarge';
    const data = await sharp(bytes, { limitInputPixels: IMAGE_MAX_PIXELS })
      // the camera's orientation, then the EXIF goes (with it any GPS position)
      .rotate()
      .resize(toWidth(IMAGE_MAX_WIDTH))
      .webp({ quality: 80 })
      .toBuffer();
    const small = await sharp(data)
      .resize(toWidth(IMAGE_SMALL_WIDTH))
      .webp({ quality: 75 })
      .toBuffer();
    return { data: new Uint8Array(data), small: new Uint8Array(small) };
  } catch {
    return 'unreadable';
  }
}
