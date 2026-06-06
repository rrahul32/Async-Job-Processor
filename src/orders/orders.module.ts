import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderProcessingProcessor } from './order-processing.processor';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [OrdersService, OrderProcessingProcessor],
  controllers: [OrdersController],
})
export class OrdersModule {}
