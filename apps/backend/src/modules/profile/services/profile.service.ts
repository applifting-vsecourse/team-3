import { Prisma } from '@/generated/prisma/client';
import {
  selfProfile,
  type ProfileOverview,
  type ProfileRow,
  type SelfProfile,
  type UpdateProfileInput,
} from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { nameProblem } from '@/shared/auth/domain/name-policy';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  private async owner(userId: string): Promise<ProfileRow> {
    const row = await this.repository.get(userId);
    if (!row || row.deletedAt) throw new UnauthorizedException();
    return row;
  }

  async get(userId: string): Promise<SelfProfile> {
    return selfProfile(await this.owner(userId));
  }

  async update(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<SelfProfile> {
    const row = await this.owner(userId);
    if (row.blockedAt)
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Tvůj účet je zablokovaný.',
      });
    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) {
      const problem = nameProblem(input.name);
      if (problem)
        throw new BadRequestException({
          code: 'INVALID_NAME',
          message: problem,
        });
      data.name = input.name.trim();
    }
    if (input.homeLocalityId !== undefined) {
      if (
        input.homeLocalityId !== null &&
        !(await this.repository.localityExists(input.homeLocalityId))
      ) {
        throw new BadRequestException({
          code: 'UNKNOWN_LOCALITY',
          message: 'Vyber domovskou lokalitu ze seznamu.',
        });
      }
      data.homeLocality =
        input.homeLocalityId === null
          ? { disconnect: true }
          : { connect: { id: input.homeLocalityId } };
    }
    if (input.interestIds !== undefined) {
      if (!(await this.repository.interestsExist(input.interestIds))) {
        throw new BadRequestException({
          code: 'UNKNOWN_ACTIVITY',
          message: 'Vyber zájmy z nabídky aktivit.',
        });
      }
      // One nested update replaces this owner's interests atomically.
      data.interests = {
        deleteMany: {},
        create: input.interestIds.map((id) => ({
          activity: { connect: { id } },
        })),
      };
    }
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Vyber aspoň jeden údaj ke změně.');
    data.updatedAt = new Date();
    return selfProfile(await this.repository.save(userId, data));
  }

  async overview(userId: string): Promise<ProfileOverview> {
    await this.owner(userId);
    return this.repository.overview(userId, new Date());
  }
}
