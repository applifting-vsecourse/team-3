import type { InAppType } from '@/modules/notification/domain/in-app';
import type {
  Centre,
  CentreItem,
} from '@/modules/notification/services/notification-center.service';
import { ApiProperty } from '@nestjs/swagger';

export const IN_APP_TYPES: InAppType[] = [
  'request_received',
  'participant_joined',
  'participant_left',
  'request_approved',
  'request_rejected',
  'event_changed',
  'event_cancelled',
  'event_message',
  'group_announcement',
  'group_join_request',
  'group_request_approved',
  'group_request_rejected',
  'friend_request',
  'friend_accepted',
  'friend_invite_joined',
];

class NotificationItemDto implements CentreItem {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: IN_APP_TYPES }) type!: InAppType;
  @ApiProperty({
    example: 'Jana Nováková se chce zúčastnit akce „Deskovky ve středu“.',
  })
  text!: string;
  @ApiProperty({
    example: '/akce/clx123/sprava',
    description: 'Where a click leads in the frontend',
  })
  path!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    type: Date,
    nullable: true,
    description: 'null = unread',
  })
  readAt!: Date | null;
}

/** GET /api/notifications: the centre (#86). */
export class NotificationListResponseDto implements Centre {
  @ApiProperty({
    type: [NotificationItemDto],
    description: 'The newest 50, newest first',
  })
  items!: CentreItem[];
  @ApiProperty({ description: 'All unread, also beyond the 50 listed' })
  unreadCount!: number;
}

/** GET /api/notifications/unread-count: the bell's number. */
export class UnreadCountResponseDto {
  @ApiProperty() count!: number;
}

/** POST /api/notifications/read-all. */
export class MarkAllReadResponseDto {
  @ApiProperty({ description: 'How many were unread' })
  marked!: number;
}
