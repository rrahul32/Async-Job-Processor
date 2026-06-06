import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    @InjectQueue('order-processing')
    private readonly orderProcessingQueue: Queue,
  ) {}

  async createOrder() {
    //mock order creation logic
    const orderData = {
      orderId: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
      amount: Math.floor(Math.random() * 1000),
      createdAt: new Date(),
      items: [
        {
          productId: crypto.randomUUID(),
          quantity: Math.floor(Math.random() * 5) + 1,
          price: Math.floor(Math.random() * 100) + 1,
        },
      ],
    };
    await this.orderProcessingQueue.add('process-order', orderData);
  }
}
