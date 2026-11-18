/**
 * The organizer's own image of an event (#77): a poster or a photo instead of
 * the activity's. JPEG, PNG or WebP, at most 5 MB, the same limits the
 * database's CHECK keeps (migration `event_image`).
 */
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const EVENT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type EventImageType = (typeof EVENT_IMAGE_TYPES)[number];

/** The form field the image travels in (multipart/form-data). */
export const EVENT_IMAGE_FIELD = 'image';

export const EVENT_IMAGE_MESSAGES = {
  missing: 'Vyber obrázek.',
  tooBig: 'Obrázek je moc velký. Nahraj nejvýš 5 MB.',
  wrongType:
    'Tenhle soubor nejde použít. Nahraj obrázek ve formátu JPEG, PNG nebo WebP.',
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
export function detectImageType(bytes: Uint8Array): EventImageType | null {
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

export type ImageCheck =
  { ok: true; contentType: EventImageType } | { ok: false; message: string };

/** Whether an uploaded file may become the event's image, and as what. */
export function checkEventImage(bytes: Uint8Array | undefined): ImageCheck {
  if (!bytes || bytes.length === 0) {
    return { ok: false, message: EVENT_IMAGE_MESSAGES.missing };
  }
  if (bytes.length > EVENT_IMAGE_MAX_BYTES) {
    return { ok: false, message: EVENT_IMAGE_MESSAGES.tooBig };
  }
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return { ok: false, message: EVENT_IMAGE_MESSAGES.wrongType };
  }
  return { ok: true, contentType };
}

/** The image as the API serves it. */
export type StoredEventImage = { contentType: string; data: Uint8Array };
