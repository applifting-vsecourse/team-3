import { EventManagementView } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { EventParticipantDto } from './event-detail.response.dto';

class EventRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Jakub Král' })
  name!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: string;
}

/** Who is in and who is waiting, for the organizer's management page (B-033, #43, #53). */
export class EventParticipantsResponseDto {
  @ApiProperty({
    type: [EventParticipantDto],
    description: 'Approved participants in the order they got their place',
  })
  participants!: EventParticipantDto[];

  @ApiProperty({
    type: [EventRequestDto],
    description:
      'Requests waiting for the organizer (approval events), oldest first',
  })
  requests!: EventRequestDto[];

  static fromDomain(view: EventManagementView): EventParticipantsResponseDto {
    return {
      participants: view.participants.map(({ id, name }) => ({ id, name })),
      requests: view.requests.map(({ id, name, requestedAt }) => ({
        id,
        name,
        requestedAt: requestedAt.toISOString(),
      })),
    };
  }
}
