import { ImageUploadFilter } from '@/modules/image/controllers/image-upload.filter';
import {
  IMAGE_FIELD,
  IMAGE_MAX_BYTES,
} from '@/modules/image/domain/uploaded-image';
import {
  applyDecorators,
  BadRequestException,
  UseFilters,
  UseInterceptors,
  ValidationPipe,
  type PipeTransform,
  type Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

const PROFILE_FIELD_LIMIT = 16 * 1024;

export const ProfileUpload = (): MethodDecorator =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor(IMAGE_FIELD, {
        limits: {
          fileSize: IMAGE_MAX_BYTES,
          files: 1,
          fieldSize: PROFILE_FIELD_LIMIT,
          fields: 1,
        },
      }),
    ),
    UseFilters(ImageUploadFilter),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['profile'],
        properties: {
          profile: {
            type: 'string',
            description: 'The profile fields as a JSON object',
          },
          [IMAGE_FIELD]: { type: 'string', format: 'binary' },
        },
      },
    }),
  );

/** Parse the text part and run the same DTO validation as for a JSON body. */
export class ProfilePayloadPipe<T> implements PipeTransform<
  unknown,
  Promise<T>
> {
  private readonly validation = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  constructor(private readonly dto: Type<T>) {}

  async transform(value: unknown): Promise<T> {
    if (
      typeof value !== 'string' ||
      Buffer.byteLength(value) > PROFILE_FIELD_LIMIT
    ) {
      throw new BadRequestException('Údaje profilu se nepodařilo načíst.');
    }
    let object: unknown;
    try {
      object = JSON.parse(value);
    } catch {
      throw new BadRequestException('Údaje profilu se nepodařilo načíst.');
    }
    if (!object || typeof object !== 'object' || Array.isArray(object)) {
      throw new BadRequestException('Údaje profilu se nepodařilo načíst.');
    }
    return (await this.validation.transform(object, {
      type: 'body',
      metatype: this.dto,
    })) as T;
  }
}
