import { resizeImage } from './resize-image';
import {
  IMAGE_MAX_BYTES,
  IMAGE_MESSAGES,
  prepareImage,
} from './uploaded-image';

jest.mock('./resize-image', () => ({ resizeImage: jest.fn() }));

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

describe('prepareImage: the stored size (review #366)', () => {
  it('a resized image over 5 MB is refused in Czech, not left to the database', async () => {
    jest.mocked(resizeImage).mockResolvedValue({
      data: new Uint8Array(IMAGE_MAX_BYTES + 1),
      small: new Uint8Array(10),
    });

    await expect(prepareImage(PNG)).resolves.toEqual({
      ok: false,
      message: IMAGE_MESSAGES.tooLarge,
    });
  });

  it('exactly 5 MB still goes', async () => {
    jest.mocked(resizeImage).mockResolvedValue({
      data: new Uint8Array(IMAGE_MAX_BYTES),
      small: new Uint8Array(10),
    });

    await expect(prepareImage(PNG)).resolves.toMatchObject({ ok: true });
  });
});
