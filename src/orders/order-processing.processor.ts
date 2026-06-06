import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('order-processing')
export class OrderProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessingProcessor.name);

  process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} [${job.name}]`);
    this.logger.debug(`Order data: ${JSON.stringify(job.data)}`);
    // Minimal slice: acknowledge the order. Real workflow steps come later.
    return Promise.resolve();
  }
}
