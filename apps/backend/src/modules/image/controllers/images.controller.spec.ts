import { ImageRepository } from '@/modules/image/repositories/image.repository';
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { ImagesController } from './images.controller';

const aResponse = (): ReturnType<typeof mock<Response>> => {
  const response = mock<Response>();
  response.status.mockReturnValue(response);
  response.set.mockReturnValue(response);
  return response;
};

describe('ImagesController (#77)', () => {
  it('serves the image as its checked type, never sniffed, cached for good', async () => {
    const service = mock<ImageRepository>();
    service.findImage.mockResolvedValue({
      contentType: 'image/webp',
      data: Uint8Array.from([1, 2, 3]),
    });
    const response = aResponse();

    await new ImagesController(service).image('k1', response);

    expect(service.findImage).toHaveBeenCalledWith('k1', 'full');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'same-site',
      }),
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
  });

  it('an unknown key is 404 and sends nothing', async () => {
    const service = mock<ImageRepository>();
    service.findImage.mockResolvedValue(null);
    const response = aResponse();

    await expect(
      new ImagesController(service).image('k2', response),
    ).rejects.toThrow(NotFoundException);
    expect(response.send).not.toHaveBeenCalled();
  });

  it("/small serves the cards' variant", async () => {
    const service = mock<ImageRepository>();
    service.findImage.mockResolvedValue({
      contentType: 'image/webp',
      data: Uint8Array.from([7]),
    });
    const response = aResponse();

    await new ImagesController(service).small('k1', response);

    expect(service.findImage).toHaveBeenCalledWith('k1', 'small');
    expect(response.send).toHaveBeenCalledWith(Buffer.from([7]));
  });
});
