import { BoundedWindowCounter } from './bounded-window-counter';

describe('BoundedWindowCounter', () => {
  const counter = (maxKeys = 100): BoundedWindowCounter =>
    new BoundedWindowCounter({ limit: 2, windowMs: 1000, maxKeys });

  it('allows the limit per key in a window, then refuses until it is over', () => {
    const c = counter();

    expect([c.hit('a', 0), c.hit('a', 1), c.hit('a', 2)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(c.hit('b', 3)).toBe(true);
    expect(c.hit('a', 1000)).toBe(true);
  });

  it('never holds more keys than its cap and refuses new ones when full', () => {
    const c = counter(3);
    for (let i = 0; i < 1000; i++) c.hit(`k${i}`, 10);

    expect(c.size).toBe(3);
    expect(c.isRefused('k999', 11)).toBe(true);
    // the first keys keep counting
    c.hit('k0', 11);
    expect(c.hit('k0', 12)).toBe(false);
  });

  it('does not let other keys flush a running window', () => {
    const c = counter(3);
    c.hit('victim', 0);
    c.hit('victim', 1);
    for (let i = 0; i < 1000; i++) c.hit(`junk${i}`, 2);

    expect(c.isRefused('victim', 3)).toBe(true);
    expect(c.hit('victim', 3)).toBe(false);
  });

  it('takes new keys again once old windows are over', () => {
    const c = counter(1);
    c.hit('a', 0);
    expect(c.hit('b', 10)).toBe(false);

    expect(c.hit('b', 1000)).toBe(true);
  });

  it('forgets windows that are over', () => {
    const c = counter();
    c.hit('a', 0);
    c.hit('b', 10);

    c.hit('c', 1005);

    expect(c.size).toBe(2);
    c.hit('d', 2000);
    expect(c.size).toBe(2);
  });

  it('checks without counting, and forgets a key on reset', () => {
    const c = counter();
    c.hit('a', 0);
    expect(c.isRefused('a', 1)).toBe(false);
    expect(c.isRefused('a', 2)).toBe(false);
    c.hit('a', 3);
    expect(c.isRefused('a', 4)).toBe(true);

    c.reset('a');

    expect(c.isRefused('a', 5)).toBe(false);
    expect(c.size).toBe(0);
  });
});
