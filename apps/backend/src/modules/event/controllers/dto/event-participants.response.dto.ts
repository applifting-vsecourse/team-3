import { EventParticipant } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { EventParticipantDto } from './event-detail.response.dto';

/** Who is in, for the organizer's management page (B-033, #43). */
export class EventParticipantsResponseDto {
  @ApiProperty({
    type: [EventParticipantDto],
    description: 'Approved participants in the order they got their place',
  })
  participants!: EventParticipantDto[];

  static fromDomain(
    participants: EventParticipant[],
  ): EventParticipantsResponseDto {
    return {
      participants: participants.map(({ id, name }) => ({ id, name })),
    };
  }
}
