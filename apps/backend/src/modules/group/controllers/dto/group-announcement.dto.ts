import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
  GroupAnnouncement,
  GroupAnnouncements,
} from '@/modules/group/domain/announcement';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST /groups/:id/announcements — „Napsat členům“ (Figma D-08). */
export class CreateGroupAnnouncementDto {
  @ApiProperty({
    maxLength: ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
    description: 'Trimmed; required',
    example: 'Přes svátky se nehraje',
  })
  @Transform(trim)
  @IsString({ message: 'Předmět musí být text' })
  @IsNotEmpty({ message: 'Napiš předmět' })
  @MaxLength(ANNOUNCEMENT_SUBJECT_MAX_LENGTH, {
    message: `Předmět může mít nejvýš ${ANNOUNCEMENT_SUBJECT_MAX_LENGTH} znaků`,
  })
  subject!: string;

  @ApiProperty({
    maxLength: ANNOUNCEMENT_BODY_MAX_LENGTH,
    description: 'Trimmed; required. Line breaks are kept.',
    example: 'Poslední hra v roce bude 16. 12., pak pauza do 6. 1.',
  })
  @Transform(trim)
  @IsString({ message: 'Text musí být text' })
  @IsNotEmpty({ message: 'Napiš text oznámení' })
  @MaxLength(ANNOUNCEMENT_BODY_MAX_LENGTH, {
    message: `Text může mít nejvýš ${ANNOUNCEMENT_BODY_MAX_LENGTH} znaků`,
  })
  body!: string;
}

class AnnouncementSenderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Tomáš Dvořák' })
  name!: string;
}

export class GroupAnnouncementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Přes svátky se nehraje' })
  subject!: string;

  @ApiProperty({
    example: 'Poslední hra v roce bude 16. 12., pak pauza do 6. 1.',
  })
  body!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: AnnouncementSenderDto })
  sender!: AnnouncementSenderDto;

  static fromDomain({
    id,
    subject,
    body,
    createdAt,
    sender,
  }: GroupAnnouncement): GroupAnnouncementDto {
    return { id, subject, body, createdAt, sender: { ...sender } };
  }
}

/** GET /groups/:id/announcements — the „Oznámení“ section (Figma A-08e). */
export class GroupAnnouncementsResponseDto {
  @ApiProperty({
    type: [GroupAnnouncementDto],
    description: 'Newest first, at most 50',
  })
  announcements!: GroupAnnouncementDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'How many more the viewer may send today (Prague day); null unless they are an admin of an active group',
    example: 2,
  })
  remainingToday!: number | null;

  static fromDomain({
    announcements,
    remainingToday,
  }: GroupAnnouncements): GroupAnnouncementsResponseDto {
    return {
      announcements: announcements.map(GroupAnnouncementDto.fromDomain),
      remainingToday,
    };
  }
}
