import {
  EventMessage,
  EventMessages,
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_SUBJECT_MAX_LENGTH,
} from '@/modules/event/domain/event-message';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST /events/:id/messages — „Napsat účastníkům“ (Figma D-04). */
export class CreateEventMessageDto {
  @ApiProperty({
    maxLength: MESSAGE_SUBJECT_MAX_LENGTH,
    description: 'Trimmed; required',
    example: 'Hrajeme v malé tělocvičně',
  })
  @Transform(trim)
  @IsString({ message: 'Předmět musí být text' })
  @IsNotEmpty({ message: 'Napiš předmět' })
  @MaxLength(MESSAGE_SUBJECT_MAX_LENGTH, {
    message: `Předmět může mít nejvýš ${MESSAGE_SUBJECT_MAX_LENGTH} znaků`,
  })
  subject!: string;

  @ApiProperty({
    maxLength: MESSAGE_BODY_MAX_LENGTH,
    description: 'Trimmed; required. Line breaks are kept.',
    example: 'Sraz v 17:50 u vchodu z ulice Na Pankráci. Vezmi si sálovky.',
  })
  @Transform(trim)
  @IsString({ message: 'Text musí být text' })
  @IsNotEmpty({ message: 'Napiš text zprávy' })
  @MaxLength(MESSAGE_BODY_MAX_LENGTH, {
    message: `Text může mít nejvýš ${MESSAGE_BODY_MAX_LENGTH} znaků`,
  })
  body!: string;
}

class MessageSenderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Petr Holub' })
  name!: string;
}

export class EventMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Hrajeme v malé tělocvičně' })
  subject!: string;

  @ApiProperty({
    example: 'Sraz v 17:50 u vchodu z ulice Na Pankráci. Vezmi si sálovky.',
  })
  body!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: MessageSenderDto })
  sender!: MessageSenderDto;

  static fromDomain({
    id,
    subject,
    body,
    createdAt,
    sender,
  }: EventMessage): EventMessageDto {
    return { id, subject, body, createdAt, sender: { ...sender } };
  }
}

/** GET /events/:id/messages — „Zprávy od organizátora“ on the detail (Figma A-05c). */
export class EventMessagesResponseDto {
  @ApiProperty({
    type: [EventMessageDto],
    description: 'Newest first, at most 50',
  })
  messages!: EventMessageDto[];

  @ApiProperty({
    description:
      "All the event's messages, also the older ones beyond the list",
    example: 1,
  })
  total!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'How many more the viewer may send today (Prague day); null unless they are the organizer of a published event',
    example: 9,
  })
  remainingToday!: number | null;

  static fromDomain({
    messages,
    total,
    remainingToday,
  }: EventMessages): EventMessagesResponseDto {
    return {
      messages: messages.map(EventMessageDto.fromDomain),
      total,
      remainingToday,
    };
  }
}
