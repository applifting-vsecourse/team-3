import {
  GROUP_TYPES,
  GroupDetail,
  GroupSummary,
  GroupType,
  MyGroup,
} from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';

class GroupCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'hry' })
  slug!: string;

  @ApiProperty({ example: 'Hry' })
  name!: string;

  @ApiProperty({
    description: 'Icon name of the category (Figma: Activity tile)',
  })
  icon!: string;
}

class GroupActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'deskove-hry' })
  slug!: string;

  @ApiProperty({ example: 'Deskové hry' })
  name!: string;

  @ApiProperty({ type: GroupCategoryDto })
  category!: GroupCategoryDto;
}

class GroupLocalityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'praha-2' })
  slug!: string;

  @ApiProperty({ example: 'Praha 2' })
  name!: string;
}

class ViewerMembershipDto {
  @ApiProperty({ enum: ['admin', 'member'] })
  role!: 'admin' | 'member';

  @ApiProperty({ enum: ['pending', 'active', 'blocked'] })
  status!: 'pending' | 'active' | 'blocked';
}

class GroupAdminDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class GroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Deskovky Vinohrady' })
  name!: string;

  @ApiProperty({ enum: GROUP_TYPES })
  type!: GroupType;

  @ApiProperty({ type: GroupActivityDto })
  activity!: GroupActivityDto;

  @ApiProperty({ type: GroupLocalityDto })
  locality!: GroupLocalityDto;

  @ApiProperty({
    example: 5,
    description: 'Approved members incl. admins; pending requests not counted',
  })
  memberCount!: number;

  static fromDomain(group: GroupSummary): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      type: group.type,
      activity: group.activity,
      locality: group.locality,
      memberCount: group.memberCount,
    };
  }
}

export class GroupDetailResponseDto extends GroupResponseDto {
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['active', 'inactive'] })
  status!: 'active' | 'inactive';

  @ApiProperty({ type: [GroupAdminDto] })
  admins!: GroupAdminDto[];

  @ApiProperty({
    type: ViewerMembershipDto,
    nullable: true,
    description:
      "The signed-in viewer's own membership; null for a visitor or a non-member",
  })
  viewerMembership!: ViewerMembershipDto | null;

  static fromDomain(group: GroupDetail): GroupDetailResponseDto {
    return {
      ...GroupResponseDto.fromDomain(group),
      description: group.description,
      status: group.status,
      admins: group.admins,
      viewerMembership: group.viewerMembership,
    };
  }
}

class MyMembershipDto {
  @ApiProperty({ enum: ['admin', 'member'] })
  role!: 'admin' | 'member';

  @ApiProperty({
    enum: ['active', 'pending'],
    description: 'pending: my request waits for an admin',
  })
  status!: 'active' | 'pending';
}

/** GET /me/groups (B-056) */
export class MyGroupResponseDto extends GroupResponseDto {
  @ApiProperty({ type: MyMembershipDto })
  membership!: MyMembershipDto;

  static fromDomain(group: MyGroup): MyGroupResponseDto {
    return {
      ...GroupResponseDto.fromDomain(group),
      membership: group.membership,
    };
  }
}
