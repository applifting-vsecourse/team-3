import { SimulatedInboxService } from '@/modules/simulated-inbox/services/simulated-inbox.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  SIMULATED_INBOX_ADDRESS_LIMIT,
  SimulatedInboxLimits,
} from './simulated-inbox-limits';
import { SimulatedInboxController } from './simulated-inbox.controller';

// The service's file would load better-auth's ESM-only node entry.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const setUp = (getMessages: jest.Mock) => {
  const limits = new SimulatedInboxLimits();
  const controller = new SimulatedInboxController(
    { getMessages } as unknown as SimulatedInboxService,
    limits,
  );
  return { controller, limits };
};

const body = { email: ' Eva.Mala@example.com', password: 'heslo' };

describe('SimulatedInboxController', () => {
  it('counts a refused look (401) against the address', async () => {
    const { controller, limits } = setUp(
      jest.fn().mockRejectedValue(new UnauthorizedException()),
    );

    for (let i = 0; i < SIMULATED_INBOX_ADDRESS_LIMIT; i++) {
      await expect(controller.open(body)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }

    expect(limits.isAddressLocked('eva.mala@example.com')).toBe(true);
  });

  it('clears the address after a successful look', async () => {
    const getMessages = jest
      .fn()
      .mockRejectedValueOnce(new UnauthorizedException())
      .mockResolvedValueOnce([]);
    const { controller, limits } = setUp(getMessages);

    await expect(controller.open(body)).rejects.toThrow();
    expect(limits.trackedKeys.addresses).toBe(1);
    await expect(controller.open(body)).resolves.toEqual({ messages: [] });

    expect(limits.trackedKeys.addresses).toBe(0);
  });

  it('does not count other errors, e.g. a blocked user', async () => {
    const { controller, limits } = setUp(
      jest.fn().mockRejectedValue(new ForbiddenException()),
    );

    await expect(controller.open(body)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(limits.trackedKeys.addresses).toBe(0);
  });
});
