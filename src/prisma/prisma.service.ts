import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

/**
 * The single, injectable database client for the whole application.
 *
 * Extends the generated (Prisma 7, Rust-free) `PrismaClient` and ties its
 * connection lifecycle to Nest's:
 * - `onModuleInit` → `$connect()` + a `SELECT 1` probe. With a driver adapter,
 *   `$connect()` is LAZY — it resolves without opening a socket (verified
 *   empirically against a closed port) — so only a real round-trip proves the
 *   database is reachable. The probe is what makes "fail fast at boot" true.
 * - `onApplicationShutdown` → `$disconnect()`. Deliberately NOT
 *   `onModuleDestroy`: Nest runs destroy hooks BEFORE `dispose()` closes the
 *   HTTP server, so a pool released there dies under in-flight requests during
 *   a rollout. `onApplicationShutdown` runs after the server has drained.
 *   Both require `app.enableShutdownHooks()` in `main.ts` to fire on signals.
 *
 * The connection is supplied by a `pg` driver adapter (required in Prisma 7),
 * which is also where we **bound resources**: a per-process pool cap and a
 * real connection-acquire timeout, both from typed config.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('database.url'),
      // Bounded resources: cap connections per process and fail fast (rather
      // than hang) when the pool is saturated. See ApplicationConfiguration.
      max: configService.getOrThrow<number>('database.poolMax'),
      connectionTimeoutMillis: configService.getOrThrow<number>(
        'database.connectionTimeoutMs',
      ),
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Fail fast at boot if the database is unreachable — better to refuse to
    // start than to serve traffic against a dead dependency. $connect() alone
    // cannot detect this (lazy with driver adapters); the probe can.
    await this.$connect();
    await this.$queryRaw`SELECT 1`;
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL');
  }
}
