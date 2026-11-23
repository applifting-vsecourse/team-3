import { AccountRepository } from '@/modules/account/repositories/account.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import {
  sessionFreshAgeSeconds,
  verifyCurrentPassword,
} from '@/shared/auth/utils/reauthentication';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { AccountService } from './account.service';

jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));
jest.mock('@/shared/auth/utils/reauthentication', () => ({
  verifyCurrentPassword: jest.fn(),
  sessionFreshAgeSeconds: jest.fn(),
}));
const verify = jest.mocked(verifyCurrentPassword);
const freshAge = jest.mocked(sessionFreshAgeSeconds);

const now = new Date('2026-11-23T12:00:00Z');
const request = (sessionCreatedAt: Date = now) =>
  ({
    headers: {},
    session: { session: { createdAt: sessionCreatedAt } },
  }) as never;

const setup = () => {
  const repository = mock<AccountRepository>();
  const events = mock<EventsService>();
  const groups = mock<GroupRepository>();
  const notifications = mock<NotificationService>();
  repository.findAccount.mockResolvedValue({
    email: 'jana@example.com',
    hasPassword: true,
  });
  repository.findAdminMemberships.mockResolvedValue([]);
  repository.deleteAccount.mockResolvedValue([]);
  events.cancelOrganizedEvents.mockResolvedValue([]);
  return {
    repository,
    events,
    groups,
    notifications,
    service: new AccountService(
      repository,
      events,
      groups,
      notifications,
      mock<BetterAuth>(),
    ),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  verify.mockResolvedValue(true);
  freshAge.mockResolvedValue(86_400);
});

describe('AccountService.delete (B-080, #64)', () => {
  it('checks the password with BetterAuth before anything changes', async () => {
    const { repository, events, service } = setup();
    verify.mockResolvedValue(false);

    await expect(
      service.delete('u1', { password: 'spatne' }, request(), now),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_PASSWORD' },
    });
    expect(verify.mock.calls[0][2]).toBe('spatne');
    expect(events.cancelOrganizedEvents).not.toHaveBeenCalled();
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it('refuses a password account without a password', async () => {
    const { repository, service } = setup();
    await expect(
      service.delete('u1', { confirmation: 'smazat účet' }, request(), now),
    ).rejects.toThrow(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it('cancels the upcoming events with the reason, then anonymizes the account', async () => {
    const { repository, events, service } = setup();
    const order: string[] = [];
    events.cancelOrganizedEvents.mockImplementation(async () => {
      order.push('cancel');
      return ['e1'];
    });
    repository.deleteAccount.mockImplementation(async () => {
      order.push('anonymize');
      return [];
    });

    await service.delete('u1', { password: 'Tajne123' }, request(), now);

    expect(events.cancelOrganizedEvents).toHaveBeenCalledWith(
      'u1',
      'Účet organizátora byl smazán.',
      now,
    );
    expect(repository.deleteAccount).toHaveBeenCalledWith(
      'u1',
      'jana@example.com',
      now,
    );
    expect(order).toEqual(['cancel', 'anonymize']);
  });

  it('deactivates only the groups the person runs alone', async () => {
    const { repository, groups, service } = setup();
    repository.findAdminMemberships.mockResolvedValue([
      {
        groupId: 'alone',
        groupName: 'A',
        groupStatus: 'active',
        activeAdminCount: 1,
      },
      {
        groupId: 'shared',
        groupName: 'B',
        groupStatus: 'active',
        activeAdminCount: 2,
      },
    ]);

    await service.delete('u1', { password: 'Tajne123' }, request(), now);

    expect(groups.deactivateGroup).toHaveBeenCalledTimes(1);
    expect(groups.deactivateGroup).toHaveBeenCalledWith('alone', now);
  });

  it('tells the organizers of the events where a place was given up', async () => {
    const { repository, notifications, service } = setup();
    repository.deleteAccount.mockResolvedValue(['e7']);

    await service.delete('u1', { password: 'Tajne123' }, request(), now);

    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'participant-left',
      eventId: 'e7',
      participantId: 'u1',
    });
  });

  it('confirms a Google-only account by the phrase and a fresh sign-in', async () => {
    const { repository, service } = setup();
    repository.findAccount.mockResolvedValue({
      email: 'g@example.com',
      hasPassword: false,
    });

    await service.delete(
      'u1',
      { confirmation: 'Smazat účet' },
      request(new Date(now.getTime() - 60_000)),
      now,
    );
    expect(verify).not.toHaveBeenCalled();
    expect(repository.deleteAccount).toHaveBeenCalled();

    repository.deleteAccount.mockClear();
    await expect(
      service.delete(
        'u1',
        { confirmation: 'smazat účet' },
        request(new Date(now.getTime() - 2 * 86_400_000)),
        now,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.delete('u1', { confirmation: 'ano' }, request(), now),
    ).rejects.toMatchObject({ response: { code: 'CONFIRMATION_MISMATCH' } });
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it('refuses an account deleted meanwhile', async () => {
    const { repository, service } = setup();
    repository.findAccount.mockResolvedValue(null);
    await expect(
      service.delete('u1', { password: 'x' }, request(), now),
    ).rejects.toThrow(UnauthorizedException);

    const second = setup();
    second.repository.deleteAccount.mockResolvedValue(null);
    await expect(
      second.service.delete('u1', { password: 'x' }, request(), now),
    ).rejects.toThrow(UnauthorizedException);
    expect(second.notifications.notify).not.toHaveBeenCalled();
  });
});

describe('AccountService.summary and export (#64)', () => {
  it('names the groups run alone and the events to cancel', async () => {
    const { repository, service } = setup();
    repository.findAdminMemberships.mockResolvedValue([
      {
        groupId: 'g1',
        groupName: 'Běžci',
        groupStatus: 'active',
        activeAdminCount: 1,
      },
    ]);
    repository.countUpcomingOrganized.mockResolvedValue(2);

    await expect(service.summary('u1', now)).resolves.toEqual({
      hasPassword: true,
      confirmationPhrase: 'smazat účet',
      groupsRunAlone: [{ id: 'g1', name: 'Běžci' }],
      upcomingOrganizedCount: 2,
    });
  });

  it('exports nothing for a deleted account', async () => {
    const { repository, service } = setup();
    repository.exportRows.mockResolvedValue(null);
    await expect(service.export('u1', now)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
