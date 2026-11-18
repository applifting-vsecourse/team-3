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

  /** An uploaded image by its key, for serving it; null when there is none. */
  async findImage(key: string): Promise<StoredImage | null> {
    return this.prisma.uploadedImage.findUnique({
      where: { key },
      select: { contentType: true, data: true },
    });
  }
}
