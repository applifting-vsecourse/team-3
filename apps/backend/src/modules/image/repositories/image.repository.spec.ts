import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { createImage, ImageRepository } from './image.repository';

describe('ImageRepository (#77)', () => {
  it('stores the image with its small variant and the size of the stored file', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.uploadedImage.create.mockResolvedValue({ key: 'k1' } as never);
    const data = Uint8Array.from([1, 2, 3]);
    const small = Uint8Array.from([4]);

    await expect(
      createImage(prisma, { contentType: 'image/webp', data, small }),
    ).resolves.toBe('k1');
    expect(prisma.uploadedImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { contentType: 'image/webp', data, size: 3, small },
      }),
    );
  });

  it('serves the small variant when asked for it', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.uploadedImage.findUnique.mockResolvedValue({
      contentType: 'image/webp',
      small: Uint8Array.from([4]),
    } as never);

    await expect(
      new ImageRepository(prisma).findImage('k1', 'small'),
    ).resolves.toEqual({
      contentType: 'image/webp',
      data: Uint8Array.from([4]),
    });
    expect(prisma.uploadedImage.findUnique).toHaveBeenCalledWith({
      where: { key: 'k1' },
      select: { contentType: true, data: false, small: true },
    });
  });

  it('an unknown key is null', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.uploadedImage.findUnique.mockResolvedValue(null);

    await expect(
      new ImageRepository(prisma).findImage('nope'),
    ).resolves.toBeNull();
  });
});
