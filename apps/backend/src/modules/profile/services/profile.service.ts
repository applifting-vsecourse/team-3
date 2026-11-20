import { Prisma } from '@/generated/prisma/client';
import {
  selfProfile,
  type OnboardingInput,
  type ProfileOverview,
  type ProfileRow,
  type SelfProfile,
  type UpdateProfileInput,
} from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { nameProblem, trimName } from '@/shared/auth/domain/name-policy';
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
      data.name = trimName(input.name);
    }
    Object.assign(data, await this.preferences(input));
    if (input.bio !== undefined) data.bio = input.bio?.trim() || null;
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Vyber aspoň jeden údaj ke změně.');
    data.updatedAt = new Date();
    return selfProfile(await this.repository.save(userId, data));
  }

  async finishOnboarding(
    userId: string,
    input?: OnboardingInput,
  ): Promise<{
    onboardingCompletedAt: Date;
    localitySlug: string | null;
    hasInterests: boolean;
  }> {
    const preferences = input ? await this.preferences(input) : {};
    const bio = input?.bio?.trim();
    if (bio) {
      preferences.bio = bio;
      preferences.bioVisibility = 'nobody';
    }
    const saved = await this.repository.finishOnboarding(userId, preferences);
    if (!saved?.onboardingCompletedAt) throw new UnauthorizedException();
    return {
      onboardingCompletedAt: saved.onboardingCompletedAt,
      localitySlug: saved.homeLocality?.slug ?? null,
      hasInterests: saved._count.interests > 0,
    };
  }

  private async preferences(
    input: Pick<UpdateProfileInput, 'homeLocalityId' | 'interestIds'>,
  ): Promise<Prisma.UserUpdateInput> {
    const data: Prisma.UserUpdateInput = {};
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
    return data;
  }

  async overview(userId: string): Promise<ProfileOverview> {
    await this.owner(userId);
    return this.repository.overview(userId);
  }
}
