import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let createOrder: jest.Mock;

  beforeEach(async () => {
    createOrder = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: { createOrder },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the validated dto to the service and returns its result', async () => {
    const dto: CreateOrderDto = {
      customerId: 'CUST-42',
      items: [{ productId: 'SKU-1001', quantity: 2, price: 1999 }],
      amount: 3998,
    };
    const expected = { orderId: 'generated-id', status: 'queued' as const };
    createOrder.mockResolvedValue(expected);

    await expect(controller.createOrder(dto)).resolves.toEqual(expected);
    expect(createOrder).toHaveBeenCalledWith(dto);
  });
});
