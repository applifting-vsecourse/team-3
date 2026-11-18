import { ArgumentsHost, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { EventImageUploadFilter } from './event-image-upload.filter';

describe('EventImageUploadFilter (#77)', () => {
  it("turns multer's English „File too large“ into the form's Czech sentence", () => {
    const response = mock<Response>();
    response.status.mockReturnValue(response);
    const host = mock<ArgumentsHost>();
    host.switchToHttp.mockReturnValue({
      getResponse: () => response,
      getRequest: jest.fn(),
      getNext: jest.fn(),
    } as never);

    new EventImageUploadFilter().catch(
      new PayloadTooLargeException('File too large'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Obrázek je moc velký. Nahraj nejvýš 5 MB.',
      }),
    );
  });
});
