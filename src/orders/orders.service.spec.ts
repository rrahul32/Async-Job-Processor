import { getQueueToken } from '@nestjs/bullmq';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderJobData, OrdersService } from './orders.service';

const sampleDto = (): CreateOrderDto => ({
  customerId: 'CUST-42',
  items: [{ productId: 'SKU-1001', quantity: 2, price: 1999 }],
  amount: 3998,
});

describe('OrdersService', () => {
  let service: OrdersService;
  // Typed so `queueAdd.mock.calls[0]` is a [name, payload] tuple, not `any[]`.
  let queueAdd: jest.Mock<Promise<void>, [string, OrderJobData]>;

  beforeEach(async () => {
    queueAdd = jest
      .fn<Promise<void>, [string, OrderJobData]>()
      .mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getQueueToken('order-processing'),
          useValue: { add: queueAdd },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('enqueues a process-order job carrying the submitted data', async () => {
    const dto = sampleDto();
    await service.createOrder(dto);

    expect(queueAdd).toHaveBeenCalledTimes(1);
    const [jobName, payload] = queueAdd.mock.calls[0];
    expect(jobName).toBe('process-order');
    expect(payload).toMatchObject({
      customerId: dto.customerId,
      amount: dto.amount,
      items: dto.items,
    });
  });

  it('stamps a server-generated orderId and ISO createdAt (not client-supplied)', async () => {
    const result = await service.createOrder(sampleDto());

    expect(result.status).toBe('queued');
    expect(typeof result.orderId).toBe('string');
    const payload = queueAdd.mock.calls[0][1];
    expect(payload.orderId).toBe(result.orderId);
    // UUID v4 shape and a parseable ISO timestamp.
    expect(payload.orderId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(Number.isNaN(Date.parse(payload.createdAt))).toBe(false);
  });

  it('generates a distinct orderId per call', async () => {
    const a = await service.createOrder(sampleDto());
    const b = await service.createOrder(sampleDto());
    expect(a.orderId).not.toBe(b.orderId);
  });

  it('translates an enqueue failure into 503 (no false "queued")', async () => {
    queueAdd.mockRejectedValueOnce(new Error('Redis connection refused'));
    await expect(service.createOrder(sampleDto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
