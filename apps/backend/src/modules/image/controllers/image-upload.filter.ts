import { IMAGE_MESSAGES } from '@/modules/image/domain/uploaded-image';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Multer stops reading a file over the limit with an English „File too large“
 * before the controller runs; the user gets the same Czech sentence as the
 * form's own check (#77).
 */
@Catch(PayloadTooLargeException)
export class ImageUploadFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      error: 'Payload Too Large',
      message: IMAGE_MESSAGES.tooBig,
    });
  }
}
