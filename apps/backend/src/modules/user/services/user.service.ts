import {
  publicProfile,
  type PublicUserProfile,
} from '@/modules/user/domain/public-profile';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private readonly repository: UserRepository) {}
  async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const user = await this.repository.getPublicUser(userId);
    if (!user) throw new NotFoundException('Profil není dostupný.');
    const now = new Date();
    const details = await this.repository.details(userId, now);
    return publicProfile(
      user,
      details.received,
      details.personal,
      details.events,
      now,
    );
  }
}
