import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import { ipToHex } from '@/modules/geo/domain/ip-address';
import { czechTowns } from '@/scripts/seed/data/czech-towns';
import { demoLocalities } from '@/scripts/seed/data/demo-data';
import {
  mergeRanges,
  parseDbIpLine,
  townFor,
  type SlugRange,
} from './ip-localities';

/**
 * Builds `modules/geo/data/ip-localities-cz.txt` (#55, BACKLOG Q2) from
 * DB-IP's free „IP to City Lite“ (CC BY 4.0): the Czech ranges only, each
 * with its catalog town. Nothing is downloaded at runtime or in the build.
 *
 *   pnpm backend geo:build            # this month's file
 *   pnpm backend geo:build 2026-11
 *
 * DB-IP publishes a new file monthly; run it now and then and commit the result.
 */
async function main(): Promise<void> {
  const month = process.argv[2] ?? new Date().toISOString().slice(0, 7);
  const url = `https://download.db-ip.com/free/dbip-city-lite-${month}.csv.gz`;
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`${url}: ${response.status}`);
  }

  // Cities, not Prague's districts: an IP says no more than the town.
  const towns = [
    ...demoLocalities.filter((locality) => locality.parentSlug === null),
    ...czechTowns,
  ];

  const ranges: SlugRange[] = [];
  const lines = createInterface({
    input: Readable.fromWeb(response.body as ReadableStream).pipe(
      createGunzip(),
    ),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const row = parseDbIpLine(line);
    if (row?.country !== 'CZ') continue;
    const start = ipToHex(row.start);
    const end = ipToHex(row.end);
    if (!start || !end) continue;
    ranges.push({ start, end, slug: townFor(row, towns).slug });
  }

  const merged = mergeRanges(ranges.sort(byStart));
  const file = join(__dirname, '../../modules/geo/data/ip-localities-cz.txt');
  writeFileSync(
    file,
    [
      `# IP Geolocation by DB-IP (https://db-ip.com), „IP to City Lite“ ${month}, CC BY 4.0.`,
      '# Czech ranges only, each with its nearest catalog town. Built by `pnpm backend geo:build`; do not edit.',
      '# start end slug (addresses as fixed-width hex, IPv4 then IPv6)',
      ...merged.map((range) => `${range.start} ${range.end} ${range.slug}`),
      '',
    ].join('\n'),
  );
  console.log(
    `${ranges.length} ranges, ${merged.length} after merging → ${file}`,
  );
}

// IPv4 (8 digits) before IPv6 (32), then by address
const byStart = (a: SlugRange, b: SlugRange): number =>
  a.start.length - b.start.length || (a.start < b.start ? -1 : 1);

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
