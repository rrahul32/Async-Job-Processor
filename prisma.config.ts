import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration (Prisma 7). Replaces the old `package.json#prisma`
 * block and the schema-level `env()` reads. The CLI uses this to locate the
 * schema and migrations and to connect for `migrate` / `studio`.
 *
 * Note the split introduced in v7:
 * - The **CLI** (migrate/studio) reads `DATABASE_URL` here. v7 no longer loads
 *   `.env` automatically, so we import `dotenv/config` explicitly.
 * - The **runtime client** does NOT use this — it connects through the `pg`
 *   driver adapter built in `PrismaService` from the typed `ConfigService`.
 *
 * DATABASE_URL policy (mirrors src/config/configuration.ts — required, no
 * default): commands that CONNECT to a database (`migrate`, `studio`, `db ...`)
 * throw without an explicit DATABASE_URL — silently defaulting could apply
 * migrations to an unintended database (wrong-target success is worse than an
 * error). Commands that never connect (`generate`, `validate`, `format`) get
 * no datasource at all — none is needed — so offline `prisma generate`, run
 * from `postinstall`/`prebuild` on a fresh clone with no `.env`, keeps working.
 */
const CONNECTING_COMMANDS = ['migrate', 'studio', 'db'];
const needsDatabase = process.argv.some((arg) =>
  CONNECTING_COMMANDS.includes(arg),
);

if (needsDatabase && !process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required for Prisma commands that connect to a database (migrate/studio/db). For local development: cp .env.example .env',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
