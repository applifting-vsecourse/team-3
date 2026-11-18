import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { NewImage, StoredImage } from '@/modules/image/domain/uploaded-image';
import { Injectable } from '@nestjs/common';

/**
 * Stores a new image inside the caller's transaction (#77) and returns its
 * key. The caller points its event or group at it and then deletes the
 * previous one with `deleteImage`, so a replaced image leaves nothing behind.
 */
export async function createImage(
  tx: Prisma.TransactionClient,
  image: NewImage,
): Promise<string> {
  const created = await tx.uploadedImage.create({
    data: {
      contentType: image.contentType,
      // a copy backed by a plain ArrayBuffer, as Prisma's Bytes wants
      data: Uint8Array.from(image.data),
      size: image.data.length,
      small: Uint8Array.from(image.small),
    },
    select: { key: true },
  });
  return created.key;
}

export async function deleteImage(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<void> {
  await tx.uploadedImage.delete({ where: { key } });
}

@Injectable()
export class ImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** An uploaded image by its key, or its small variant for the cards; null when there is none. */
  async findImage(
    key: string,
    size: 'full' | 'small' = 'full',
  ): Promise<StoredImage | null> {
    const image = await this.prisma.uploadedImage.findUnique({
      where: { key },
      select: {
        contentType: true,
        data: size === 'full',
        small: size === 'small',
      },
    });
    if (!image) return null;
    const data = size === 'small' ? image.small : image.data;
    return data ? { contentType: image.contentType, data } : null;
  }
}
