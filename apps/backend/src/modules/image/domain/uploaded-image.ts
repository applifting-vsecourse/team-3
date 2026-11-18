import { resizeImage } from './resize-image';

/**
 * An image an organizer or a group's admin uploaded (#77): an event's poster
 * or photo, a group's photo, in place of the activity's. JPEG, PNG or WebP,
 * at most 5 MB, the same limits the database's CHECK keeps (migration
 * `uploaded_image`).
 */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** The form field the image travels in (multipart/form-data). */
export const IMAGE_FIELD = 'image';

export const IMAGE_MESSAGES = {
  missing: 'Vyber obrázek.',
  tooBig: 'Obrázek je moc velký. Nahraj nejvýš 5 MB.',
  wrongType:
    'Tenhle soubor nejde použít. Nahraj obrázek ve formátu JPEG, PNG nebo WebP.',
  tooLarge: 'Obrázek má moc velké rozměry. Zmenši ho a zkus to znovu.',
} as const;

const startsWith = (
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

/**
 * What the file really is, from its first bytes, whatever its name or the type
 * the browser sent claim: an SVG or HTML renamed to .jpg is not an image the
 * app serves (it could carry a script). Null for anything else.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  // RIFF <size> WEBP
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) {
    return 'image/webp';
  }
  return null;
}

/** An upload as it is stored: WebP at most 1600 px wide, and its small variant 480 px wide (`resizeImage`). */
export type NewImage = {
  contentType: 'image/webp';
  data: Uint8Array;
  small: Uint8Array;
};

export type FileCheck =
  { ok: true; contentType: ImageType } | { ok: false; message: string };

/** Whether an uploaded file may be an image at all: present, at most 5 MB, JPEG, PNG or WebP by its content. */
export function checkImageFile(bytes: Uint8Array | undefined): FileCheck {
  if (!bytes || bytes.length === 0) {
    return { ok: false, message: IMAGE_MESSAGES.missing };
  }
  if (bytes.length > IMAGE_MAX_BYTES) {
    return { ok: false, message: IMAGE_MESSAGES.tooBig };
  }
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return { ok: false, message: IMAGE_MESSAGES.wrongType };
  }
  return { ok: true, contentType };
}

/**
 * The upload checked and made ready to store (#77): refused with the Czech
 * reason, or resized to WebP with its small variant.
 */
export async function prepareImage(
  bytes: Uint8Array | undefined,
): Promise<{ ok: true; image: NewImage } | { ok: false; message: string }> {
  const check = checkImageFile(bytes);
  if (!check.ok) return check;
  const resized = await resizeImage(bytes!);
  if (resized === 'tooLarge') {
    return { ok: false, message: IMAGE_MESSAGES.tooLarge };
  }
  if (resized === 'unreadable') {
    return { ok: false, message: IMAGE_MESSAGES.wrongType };
  }
  return { ok: true, image: { contentType: 'image/webp', ...resized } };
}

/** The image as the API serves it. */
export type StoredImage = { contentType: string; data: Uint8Array };
