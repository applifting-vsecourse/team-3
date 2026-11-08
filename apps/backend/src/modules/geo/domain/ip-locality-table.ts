import { ipToHex } from './ip-address';

type Range = { start: string; end: string; slug: string };

/**
 * IP ranges of Czechia, each with the catalog town it is nearest to
 * (`data/ip-localities-cz.txt`, built by `pnpm backend geo:build`). One line
 * per range: `start end slug`, addresses as fixed-width hex (`ipToHex`),
 * sorted, not overlapping. `#` starts a comment.
 */
export class IpLocalityTable {
  private readonly v4: Range[];
  private readonly v6: Range[];

  constructor(text: string) {
    const ranges = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
      .map((line) => {
        const [start, end, slug] = line.split(' ');
        return { start, end, slug };
      });
    this.v4 = ranges.filter((range) => range.start.length === 8);
    this.v6 = ranges.filter((range) => range.start.length === 32);
  }

  /** The town's slug for an address, undefined outside Czechia or for what isn't an address. */
  slugFor(ip: string): string | undefined {
    const hex = ipToHex(ip);
    if (!hex) return undefined;
    const ranges = hex.length === 8 ? this.v4 : this.v6;

    // the last range starting at or before the address
    let low = 0;
    let high = ranges.length - 1;
    let found: Range | undefined;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (ranges[middle].start <= hex) {
        found = ranges[middle];
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return found && hex <= found.end ? found.slug : undefined;
  }
}
