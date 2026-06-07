import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResponseDto } from './dto/create-order-response.dto';

/** Shape of the payload carried on the `process-order` job. */
export interface OrderJobData {
  orderId: string;
  customerId: string;
  amount: number;
  items: CreateOrderDto['items'];
  /** ISO-8601 timestamp; server-assigned at acceptance time. */
  createdAt: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectQueue('order-processing')
    private readonly orderProcessingQueue: Queue,
  ) {}

  /**
   * Accept a validated order: stamp it with a server-owned `orderId` and
   * `createdAt`, then enqueue it for asynchronous processing.
   *
   * The DTO is already validated by the global `ValidationPipe` (including the
   * amount-vs-items checksum), so by the time we get here the payload is
   * well-formed and internally consistent.
   */
  async createOrder(dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    const orderData: OrderJobData = {
      // Identity and timestamp are server-owned, never client-supplied.
      orderId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      customerId: dto.customerId,
      amount: dto.amount,
      items: dto.items,
    };

    try {
      await this.orderProcessingQueue.add('process-order', orderData);
    } catch (err) {
      // The queue is the durability boundary. If we can't enqueue, we must not
      // tell the client the order was accepted — surface 503 instead of a
      // false 201 so the client can safely retry.
      this.logger.error(
        `Failed to enqueue order ${orderData.orderId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException(
        'Order could not be queued; please retry.',
      );
    }

    this.logger.log(`Order ${orderData.orderId} queued for processing`);
    return { orderId: orderData.orderId, status: 'queued' };
  }
}
