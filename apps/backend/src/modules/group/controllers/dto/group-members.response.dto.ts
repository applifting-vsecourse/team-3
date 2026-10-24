import {
  GroupMemberEntry,
  GroupMembers,
} from '@/modules/group/domain/membership';
import { ApiProperty } from '@nestjs/swagger';

class GroupMemberEntryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 'Jakub Král' })
  name!: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  role!: 'admin' | 'member';

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When they asked (a request) or joined (a member)',
  })
  since!: Date;

  static fromDomain(entry: GroupMemberEntry): GroupMemberEntryDto {
    return { ...entry };
  }
}

/** GET /groups/:id/members — the group's management (Figma D-07). */
export class GroupMembersResponseDto {
  @ApiProperty({
    type: [GroupMemberEntryDto],
    description: 'Pending requests, oldest first',
  })
  requests!: GroupMemberEntryDto[];

  @ApiProperty({
    type: [GroupMemberEntryDto],
    description: 'Active members, admins first',
  })
  members!: GroupMemberEntryDto[];

  static fromDomain(members: GroupMembers): GroupMembersResponseDto {
    return {
      requests: members.requests.map(GroupMemberEntryDto.fromDomain),
      members: members.members.map(GroupMemberEntryDto.fromDomain),
    };
  }
}

/** POST /groups/:id/join */
export class JoinGroupResponseDto {
  @ApiProperty({
    enum: ['active', 'pending'],
    description:
      'active: a member at once (public); pending: a request (closed)',
  })
  status!: 'active' | 'pending' | 'blocked';
}
