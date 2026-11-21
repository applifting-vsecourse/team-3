import { randomUUID } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prepareImage } from '@/modules/image/domain/uploaded-image';
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
  NotFoundException,
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
    photo?: { bytes?: Uint8Array; remove?: boolean },
  ): Promise<SelfProfile> {
    const row = await this.owner(userId);
    if (row.blockedAt)
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Tvůj účet je zablokovaný.',
      });
    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) {
      data.name = this.validName(input.name);
    }
    Object.assign(data, await this.preferences(input));
    if (input.bio !== undefined) data.bio = input.bio?.trim() || null;
    if (photo?.bytes && photo.remove) {
      throw new BadRequestException({
        code: 'INVALID_PHOTO',
        message: 'Vyber, jestli fotku vyměníš, nebo odebereš.',
      });
    }
    if (photo?.bytes) data.profilePhoto = await this.photoUpdate(photo.bytes);
    if (Object.keys(data).length === 0 && !photo?.remove)
      throw new BadRequestException('Vyber aspoň jeden údaj ke změně.');
    data.updatedAt = new Date();
    const saved = photo?.remove
      ? await this.repository.saveWithoutPhoto(userId, data)
      : await this.repository.save(userId, data);
    return selfProfile(saved);
  }

  async getPhoto(userId: string, version: string): Promise<Uint8Array> {
    const photo = await this.repository.getPhoto(userId, version);
    if (!photo) throw new NotFoundException('Fotka profilu neexistuje.');
    return photo.data;
  }

  async finishOnboarding(
    userId: string,
    input?: OnboardingInput,
    photo?: Uint8Array,
  ): Promise<{
    onboardingCompletedAt: Date;
    localitySlug: string | null;
    hasInterests: boolean;
    displayName: string;
  }> {
    const preferences = input ? await this.preferences(input) : {};
    if (typeof input?.displayName === 'string') {
      preferences.name = this.validName(input.displayName);
    }
    const bio = input?.bio?.trim();
    if (bio) {
      preferences.bio = bio;
      preferences.bioVisibility = 'nobody';
    }
    if (photo) preferences.profilePhoto = await this.photoUpdate(photo);
    const saved = await this.repository.finishOnboarding(userId, preferences);
    if (!saved?.onboardingCompletedAt) throw new UnauthorizedException();
    return {
      onboardingCompletedAt: saved.onboardingCompletedAt,
      localitySlug: saved.homeLocality?.slug ?? null,
      hasInterests: saved._count.interests > 0,
      displayName: saved.name,
    };
  }

  private async photoUpdate(
    bytes: Uint8Array,
  ): Promise<Prisma.ProfilePhotoUpdateOneWithoutUserNestedInput> {
    const result = await prepareImage(bytes);
    if (!result.ok) {
      throw new BadRequestException({
        code: 'INVALID_PHOTO',
        message: result.message,
      });
    }
    const photo = {
      version: randomUUID(),
      data: new Uint8Array(result.image.small),
    };
    return { upsert: { create: photo, update: photo } };
  }

  private validName(name: string): string {
    const problem = nameProblem(name);
    if (problem)
      throw new BadRequestException({
        code: 'INVALID_NAME',
        message: problem,
      });
    return trimName(name);
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
