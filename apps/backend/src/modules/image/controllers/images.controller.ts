import { ImageRepository } from '@/modules/image/repositories/image.repository';
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

/**
 * The uploaded images of events and groups (#77). Public, as the cards that
 * show them: an `imageKey` is a random UUID, a new one for every upload.
 */
@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly images: ImageRepository) {}

  @Get(':key/small')
  @ApiOperation({
    summary:
      'The small variant of an image (480 px), for the cards; the image itself when it has none',
  })
  @ApiProduces('image/webp', 'image/jpeg', 'image/png')
  @ApiResponse({ status: 200, description: 'The image' })
  @ApiResponse({ status: 404, description: 'No such image' })
  async small(
    @Param('key') key: string,
    @Res() response: Response,
  ): Promise<void> {
    await this.send(key, 'small', response);
  }

  @Get(':key')
  @ApiOperation({
    summary: "An event's or a group's own image by its `imageKey` (#77)",
    description:
      'WebP, the longer side at most 1600 px (uploaded before the resizing: as uploaded). Cached for a year: a replaced image gets a new key, so a key never shows anything else.',
  })
  @ApiProduces('image/webp', 'image/jpeg', 'image/png')
  @ApiResponse({ status: 200, description: 'The image' })
  @ApiResponse({ status: 404, description: 'No such image' })
  async image(
    @Param('key') key: string,
    @Res() response: Response,
  ): Promise<void> {
    await this.send(key, 'full', response);
  }

  private async send(
    key: string,
    size: 'full' | 'small',
    response: Response,
  ): Promise<void> {
    const image = await this.images.findImage(key, size);
    if (!image) throw new NotFoundException('Obrázek neexistuje.');
    response
      .status(200)
      .set({
        // checked by its content on upload; never sniffed as anything else
        'Content-Type': image.contentType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'public, max-age=31536000, immutable',
        // helmet's same-origin would block the <img> wherever the app and the
        // API are two origins of one site (localhost:3050 and :4050)
        'Cross-Origin-Resource-Policy': 'same-site',
      })
      .send(Buffer.from(image.data));
  }
}
