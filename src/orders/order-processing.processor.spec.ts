import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { OrderProcessingProcessor } from './order-processing.processor';

describe('OrderProcessingProcessor', () => {
  let processor: OrderProcessingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderProcessingProcessor],
    }).compile();

    processor = module.get<OrderProcessingProcessor>(OrderProcessingProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('processes a job without throwing', async () => {
    const job = { id: '1', name: 'process-order', data: {} } as Job;

    await expect(processor.process(job)).resolves.toBeUndefined();
  });
});
