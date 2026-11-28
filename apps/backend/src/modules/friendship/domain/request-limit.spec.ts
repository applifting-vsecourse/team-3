import {
  dailyRequestLimit,
  friendRequestLimit,
  MAX_DAILY_REQUEST_LIMIT,
} from './request-limit';

const midnight = new Date('2026-11-28T23:00:00.000Z');

describe('dailyRequestLimit (#473)', () => {
  it('free 20, plus 50: the plan raises the limit, never removes it', () => {
    expect(dailyRequestLimit('free')).toBe(20);
    expect(dailyRequestLimit('plus')).toBe(50);
    expect(MAX_DAILY_REQUEST_LIMIT).toBe(50);
  });
});

describe('friendRequestLimit (#473)', () => {
  it('what is left of the plan’s limit, with the next Prague midnight', () => {
    expect(friendRequestLimit(15, 'free', midnight)).toEqual({
      left: 5,
      perDay: 20,
      resetsAt: '2026-11-28T23:00:00.000Z',
      plan: 'free',
    });
    expect(friendRequestLimit(15, 'plus', midnight).left).toBe(35);
  });

  it('never below zero', () => {
    expect(friendRequestLimit(25, 'free', midnight).left).toBe(0);
  });
});
