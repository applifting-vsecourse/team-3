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
    bio: null,
    photoImageKey: null,
    photoVisibility: 'everyone',
    bioVisibility: 'everyone',
    pastEventsVisibility: 'friends',
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

describe('who sees the photo, bio and visited events (B-014, #64)', () => {
  const hidden = {
    bio: 'Hraju volejbal.',
    photoImageKey: 'photo-key',
    photoVisibility: 'organizers' as const,
    bioVisibility: 'organizers' as const,
    pastEventsVisibility: 'organizers' as const,
  };
  const person = (changes: object = hidden): Record<string, unknown> => ({
    id: 'petra',
    name: 'Petra Nováková',
    interests: [],
    ...changes,
  });

  it('a stranger does not see a field set to organizers, and its events are not even loaded', async () => {
    const { repository, friendships, service } = setup();
    repository.getPublicUser.mockResolvedValue(person() as never);
    friendships.state.mockResolvedValue('none');
    repository.isOrganizerFor.mockResolvedValue(false);

    const profile = await service.getPublicProfile('petra', 'jakub');

    expect(profile).toMatchObject({
      name: 'Petra Nováková',
      bio: null,
      photoKey: null,
      pastEvents: null,
    });
    expect(repository.isOrganizerFor).toHaveBeenCalledWith('jakub', 'petra');
    expect(repository.attendedEvents).not.toHaveBeenCalled();
  });

  it('a visitor who is not signed in sees the name, not the hidden fields', async () => {
    const { repository, service } = setup();
    repository.getPublicUser.mockResolvedValue(person() as never);

    const profile = await service.getPublicProfile('petra', null);

    expect(profile).toMatchObject({ name: 'Petra Nováková', bio: null });
    expect(repository.isOrganizerFor).not.toHaveBeenCalled();
  });

  it('the organizer of an event the person applied to sees the name and the fields', async () => {
    const { repository, friendships, service } = setup();
    repository.getPublicUser.mockResolvedValue(person() as never);
    friendships.state.mockResolvedValue('none');
    repository.isOrganizerFor.mockResolvedValue(true);
    repository.attendedEvents.mockResolvedValue([]);

    const profile = await service.getPublicProfile('petra', 'organizer');

    expect(profile).toMatchObject({
      name: 'Petra Nováková',
      bio: 'Hraju volejbal.',
      photoKey: 'photo-key',
      pastEvents: [],
    });
    expect(repository.attendedEvents).toHaveBeenCalledWith(
      'petra',
      expect.any(Date),
    );
  });

  it('a friend sees fields set to friends without the organizer check', async () => {
    const { repository, friendships, service } = setup();
    repository.getPublicUser.mockResolvedValue(
      person({
        ...hidden,
        photoVisibility: 'friends',
        bioVisibility: 'friends',
        pastEventsVisibility: 'friends',
      }) as never,
    );
    friendships.state.mockResolvedValue('friends');
    repository.friendUpcomingEvents.mockResolvedValue([]);
    repository.attendedEvents.mockResolvedValue([]);

    const profile = await service.getPublicProfile('petra', 'jakub');

    expect(profile).toMatchObject({
      bio: 'Hraju volejbal.',
      photoKey: 'photo-key',
      pastEvents: [],
    });
    expect(repository.isOrganizerFor).not.toHaveBeenCalled();
  });

  it('a friend does not see a field set to organizers', async () => {
    const { repository, friendships, service } = setup();
    repository.getPublicUser.mockResolvedValue(person() as never);
    friendships.state.mockResolvedValue('friends');
    repository.friendUpcomingEvents.mockResolvedValue([]);
    repository.isOrganizerFor.mockResolvedValue(false);

    const profile = await service.getPublicProfile('petra', 'jakub');

    expect(profile).toMatchObject({
      bio: null,
      photoKey: null,
      pastEvents: null,
    });
  });
});
