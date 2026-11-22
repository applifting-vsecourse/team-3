import type { PublicEvent } from '@/modules/event/domain/event';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { NotFoundException } from '@nestjs/common';
import { mock, type MockProxy } from 'jest-mock-extended';
import { UserService } from './user.service';

const setup = (): {
  repository: MockProxy<UserRepository>;
  friendships: MockProxy<FriendshipService>;
  service: UserService;
} => {
  const repository = mock<UserRepository>();
  const friendships = mock<FriendshipService>();
  repository.getPublicUser.mockResolvedValue({
    id: 'petra',
    name: 'Petra Nováková',
    interests: [],
  });
  repository.details.mockResolvedValue({
    received: [],
    personal: [],
    events: [],
  });
  return {
    repository,
    friendships,
    service: new UserService(repository, friendships),
  };
};

describe('public profile availability (#179)', () => {
  it('returns the same unavailable result for missing, blocked or deleted profiles before querying private history', async () => {
    const { repository, friendships, service } = setup();
    repository.getPublicUser.mockResolvedValue(null);
    await expect(
      service.getPublicProfile('unavailable', 'viewer'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.details).not.toHaveBeenCalled();
    expect(friendships.state).not.toHaveBeenCalled();
  });
});

describe('public profile and friendship (#307)', () => {
  it('a visitor: no friendship and no Kam jde', async () => {
    const { repository, friendships, service } = setup();

    const profile = await service.getPublicProfile('petra', null);

    expect(profile).toMatchObject({
      name: 'Petra Nováková',
      friendship: null,
      upcomingEvents: null,
    });
    expect(friendships.state).not.toHaveBeenCalled();
    expect(repository.friendUpcomingEvents).not.toHaveBeenCalled();
  });

  it.each(['none', 'outgoing', 'incoming', 'self'] as const)(
    'not a friend (%s): the state, but Kam jde is never even asked for',
    async (state) => {
      const { repository, friendships, service } = setup();
      friendships.state.mockResolvedValue(state);

      const profile = await service.getPublicProfile('petra', 'jakub');

      expect(profile).toMatchObject({
        friendship: state,
        upcomingEvents: null,
      });
      expect(friendships.state).toHaveBeenCalledWith('jakub', 'petra');
      expect(repository.friendUpcomingEvents).not.toHaveBeenCalled();
    },
  );

  it('a friend: Kam jde for the viewer, of the person', async () => {
    const { repository, friendships, service } = setup();
    friendships.state.mockResolvedValue('friends');
    const events = [{ id: 'e1' }] as PublicEvent[];
    repository.friendUpcomingEvents.mockResolvedValue(events);

    const profile = await service.getPublicProfile('petra', 'jakub');

    expect(profile).toMatchObject({
      friendship: 'friends',
      upcomingEvents: events,
    });
    expect(repository.friendUpcomingEvents).toHaveBeenCalledWith(
      'petra',
      'jakub',
      expect.any(Date),
    );
  });
});
