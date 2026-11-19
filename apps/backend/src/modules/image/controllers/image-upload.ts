import {
  IMAGE_FIELD,
  IMAGE_MAX_BYTES,
} from '@/modules/image/domain/uploaded-image';
import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { ImageUploadFilter } from './image-upload.filter';

/**
 * An endpoint that takes one image (#77) in the multipart field `image`, at
 * most 5 MB; over it 413 with the Czech message. Put it under the route's
 * guards: they run first, so nobody signed out gets a file read into memory.
 * Whether the user may change the image the service decides after the upload.
 */
export const ImageUpload = (): MethodDecorator =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor(IMAGE_FIELD, {
        limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
      }),
    ),
    UseFilters(ImageUploadFilter),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: [IMAGE_FIELD],
        properties: { [IMAGE_FIELD]: { type: 'string', format: 'binary' } },
      },
    }),
    ApiResponse({ status: 413, description: 'Over 5 MB (Czech message)' }),
  );

/** What multer's memory storage hands over; only the bytes matter. */
export type UploadedImageFile = { buffer: Buffer };

/** The upload's bytes; empty when no file came (the service then says „Vyber obrázek.“). */
export const uploadedBytes = (
  file: UploadedImageFile | undefined,
): Uint8Array => (file ? new Uint8Array(file.buffer) : new Uint8Array());
