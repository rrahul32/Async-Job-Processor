import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { VALIDATION_PIPE_OPTIONS } from '../src/common/validation';
import { CreateOrderResponseDto } from '../src/orders/dto/create-order-response.dto';
import { OrdersController } from '../src/orders/orders.controller';
import { OrderJobData, OrdersService } from '../src/orders/orders.service';

// Exercises the real global ValidationPipe + DTOs + controller + service over
// HTTP. The BullMQ queue is mocked, so this needs no Redis and asserts the
// validation contract (400s) and the success path (201 + generated orderId).
describe('Orders (e2e)', () => {
  let app: INestApplication;
  let queueAdd: jest.Mock<Promise<void>, [string, OrderJobData]>;

  beforeEach(async () => {
    queueAdd = jest
      .fn<Promise<void>, [string, OrderJobData]>()
      .mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        {
          provide: getQueueToken('order-processing'),
          useValue: { add: queueAdd },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same pipe policy as production (main.ts) — single source of truth.
    app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const validOrder = {
    customerId: 'CUST-42',
    items: [{ productId: 'SKU-1001', quantity: 2, price: 1999 }],
    amount: 3998,
  };

  const http = () => request(app.getHttpServer() as Server);

  it('queues a valid order and returns a generated orderId (201)', async () => {
    const res = await http().post('/orders').send(validOrder).expect(201);
    const body = res.body as CreateOrderResponseDto;

    expect(body.status).toBe('queued');
    expect(typeof body.orderId).toBe('string');
    expect(body.orderId.length).toBeGreaterThan(0);
    expect(queueAdd).toHaveBeenCalledTimes(1);
    const payload = queueAdd.mock.calls[0][1];
    expect(payload).toMatchObject({
      orderId: body.orderId,
      customerId: validOrder.customerId,
      amount: validOrder.amount,
      items: validOrder.items,
    });
  });

  it('rejects a checksum mismatch with a field-level 400', async () => {
    const res = await http()
      .post('/orders')
      .send({ ...validOrder, amount: 9999 })
      .expect(400);
    const body = res.body as { message: string[] };

    expect(body.message.join(' ')).toContain('does not match the sum');
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('rejects unknown / smuggled fields with 400 (deny-by-default)', async () => {
    await http()
      .post('/orders')
      .send({ ...validOrder, isAdmin: true })
      .expect(400);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('rejects a missing items array with 400', async () => {
    const noItems = {
      customerId: validOrder.customerId,
      amount: validOrder.amount,
    };
    await http().post('/orders').send(noItems).expect(400);
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
