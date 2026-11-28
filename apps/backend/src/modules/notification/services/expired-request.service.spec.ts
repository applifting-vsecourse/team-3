import { ExpiredRequestRepository } from '@/modules/notification/repositories/expired-request.repository';
import { mock } from 'jest-mock-extended';
import { ExpiredRequestService } from './expired-request.service';
import { NotificationService } from './notification.service';

// #465: each event's waiting applicants hear at once that it can't be decided any more
describe('ExpiredRequestService.run', () => {
  const setup = (): {
    repository: ReturnType<typeof mock<ExpiredRequestRepository>>;
    notifications: ReturnType<typeof mock<NotificationService>>;
    service: ExpiredRequestService;
  } => {
    const repository = mock<ExpiredRequestRepository>();
    const notifications = mock<NotificationService>();
    notifications.deliver.mockResolvedValue();
    return {
      repository,
      notifications,
      service: new ExpiredRequestService(repository, notifications),
    };
  };

  it('delivers one „expired“ request-decided per event, awaited', async () => {
    const { repository, notifications, service } = setup();
    repository.findDue.mockResolvedValue([
      { eventId: 'e1', userIds: ['u1', 'u2'] },
      { eventId: 'e2', userIds: ['u3'] },
    ]);

    await service.run();

    expect(notifications.deliver).toHaveBeenCalledTimes(2);
    expect(notifications.deliver).toHaveBeenCalledWith({
      type: 'request-decided',
      eventId: 'e1',
      userIds: ['u1', 'u2'],
      outcome: 'expired',
    });
    expect(notifications.deliver).toHaveBeenCalledWith({
      type: 'request-decided',
      eventId: 'e2',
      userIds: ['u3'],
      outcome: 'expired',
    });
  });

  it('a failed lookup is logged and retried on the next tick, never thrown', async () => {
    const { repository, notifications, service } = setup();
    repository.findDue.mockRejectedValue(new Error('db down'));

    await expect(service.run()).resolves.toBeUndefined();
    expect(notifications.deliver).not.toHaveBeenCalled();
  });

  it('a run already going is not started twice', async () => {
    const { repository, service } = setup();
    let release = (): void => {};
    repository.findDue.mockReturnValue(
      new Promise((resolve) => {
        release = (): void => resolve([]);
      }),
    );

    const first = service.run();
    await service.run();
    release();
    await first;
    expect(repository.findDue).toHaveBeenCalledTimes(1);
  });
});
