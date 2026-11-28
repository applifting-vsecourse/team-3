import { Prisma } from '@/generated/prisma/client';
import { pragueDayOf } from '@/modules/event/domain/prague-day';
import { decideHomeChange } from '@/modules/profile/domain/home-change';
import {
  selfProfile,
  type ProfileOverview,
  type ProfileRow,
  type SelfProfile,
  type UpdateProfileInput,
} from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { nameProblem, trimName } from '@/shared/auth/domain/name-policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
    now: Date = new Date(),
  ): Promise<SelfProfile> {
    const row = await this.owner(userId);
    if (row.blockedAt)
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Tvůj účet je zablokovaný.',
      });
    const data: Prisma.UserUpdateInput = {};
    let expected:
      | {
          homeLocalityChangeDay: string | null;
          homeLocalityChangeCount: number;
        }
      | undefined;
    if (input.name !== undefined) {
      const problem = nameProblem(input.name);
      if (problem)
        throw new BadRequestException({
          code: 'INVALID_NAME',
          message: problem,
        });
      data.name = trimName(input.name);
    }
    // a different home: at most three a Prague day (#84, Najdi parťáka's distance bands)
    if (
      input.homeLocalityId !== undefined &&
      input.homeLocalityId !== (row.homeLocality?.id ?? null)
    ) {
      const change = decideHomeChange(
        { day: row.homeLocalityChangeDay, count: row.homeLocalityChangeCount },
        pragueDayOf(now),
      );
      if (!change.ok)
        throw new HttpException(
          {
            code: 'HOME_LOCALITY_CHANGE_LIMIT',
            message:
              'Domovské místo jde změnit nejvýš třikrát za den. Zkus to zítra.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      data.homeLocalityChangeDay = change.next.day;
      data.homeLocalityChangeCount = change.next.count;
      expected = {
        homeLocalityChangeDay: row.homeLocalityChangeDay,
        homeLocalityChangeCount: row.homeLocalityChangeCount,
      };
    }
    if (input.partnerDiscoverable !== undefined) {
      data.partnerDiscoverable = input.partnerDiscoverable;
    }
    Object.assign(data, await this.preferences(input));
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Vyber aspoň jeden údaj ke změně.');
    data.updatedAt = new Date();
    const saved = expected
      ? await this.repository.save(userId, data, expected)
      : await this.repository.save(userId, data);
    // another change of home got there first: the limit is counted again on the next try
    if (!saved)
      throw new ConflictException({
        code: 'HOME_LOCALITY_CHANGED_MEANWHILE',
        message: 'Domovské místo se mezitím změnilo. Zkus to prosím znovu.',
      });
    return selfProfile(saved);
  }

  async finishOnboarding(
    userId: string,
    input?: { homeLocalityId: string; interestIds: string[] },
  ): Promise<{
    onboardingCompletedAt: Date;
    localitySlug: string | null;
    hasInterests: boolean;
  }> {
    const saved = await this.repository.finishOnboarding(
      userId,
      input ? await this.preferences(input) : {},
    );
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
