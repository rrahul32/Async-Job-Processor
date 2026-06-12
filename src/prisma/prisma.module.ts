import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Exposes the single `PrismaService` to the whole app. Marked `@Global` so
 * feature modules can inject it without importing `PrismaModule` everywhere —
 * there is exactly one database client, shared. `ConfigService` is available
 * because `ConfigModule` is registered globally in `AppModule`.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
