import { EventDetailView } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { EventDetailResponseDto } from './event-detail.response.dto';

export class CreatedEventResponseDto extends EventDetailResponseDto {
  @ApiProperty({
    example: 'https://hobbyhub.example/akce/cmvmoqpt2005d2yo5urqbbars',
    description: 'Absolute URL of the event detail, to share (B-021)',
  })
  shareUrl!: string;

  static fromCreated(
    event: EventDetailView,
    frontendUrl: string,
  ): CreatedEventResponseDto {
    return {
      ...EventDetailResponseDto.fromDomain(event),
      shareUrl: new URL(`/akce/${event.id}`, frontendUrl).toString(),
    };
  }
}
