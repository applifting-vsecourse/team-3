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

  it('never holds more keys than its cap: the oldest go first', () => {
    const c = counter(3);
    for (let i = 0; i < 1000; i++) c.hit(`k${i}`, 10);

    expect(c.size).toBe(3);
    // the newest are kept, still counted
    c.hit('k999', 11);
    expect(c.hit('k999', 12)).toBe(false);
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
});
