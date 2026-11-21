#!/usr/bin/env node
/**
 * `prisma generate`, skipped when the client in src/generated already comes from
 * this schema and this Prisma version (#370). Generating rewrites every file of
 * the client in src/, and the running dev server (`nest start --watch`) restarts
 * on that, so `pnpm check-all` (`backend build`) took the backend down for
 * 30–60 s while someone was using the app. A clean checkout (CI, the Docker
 * image) has no client yet and always generates; `prisma migrate dev`
 * generates on its own, so the dev server still reloads after a schema change.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(backend, 'src/generated/prisma');
const stamp = path.join(output, '.schema-hash');

const require = createRequire(path.join(backend, 'package.json'));
const prismaManifest = require.resolve('prisma/package.json');
const { version: prismaVersion, bin } = require(prismaManifest);
const prismaCli = path.join(
  path.dirname(prismaManifest),
  typeof bin === 'string' ? bin : bin.prisma,
);
const hash = createHash('sha256')
  .update(prismaVersion)
  .update(readFileSync(path.join(backend, 'prisma/schema.prisma')))
  .digest('hex');

const isUpToDate =
  existsSync(path.join(output, 'client.ts')) &&
  existsSync(stamp) &&
  readFileSync(stamp, 'utf8') === hash;

if (isUpToDate) {
  console.log('Prisma Client matches prisma/schema.prisma, not generated again.');
} else {
  // the CLI through this node: no shell, the same on Windows and in the image
  execFileSync(process.execPath, [prismaCli, 'generate'], {
    cwd: backend,
    stdio: 'inherit',
  });
  writeFileSync(stamp, hash);
}
