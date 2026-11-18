import { EVENT_IMAGE_MESSAGES } from '@/modules/event/domain/event-image';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Multer stops reading a file over the limit with an English „File too large“
 * before the controller runs; the organizer gets the same Czech sentence as
 * the form's own check (#77).
 */
@Catch(PayloadTooLargeException)
export class EventImageUploadFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      error: 'Payload Too Large',
      message: EVENT_IMAGE_MESSAGES.tooBig,
    });
  }
}
