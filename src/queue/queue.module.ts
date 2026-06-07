import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
          password: configService.getOrThrow<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'order-processing',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
