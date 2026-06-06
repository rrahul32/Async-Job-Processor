import { Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Submit an order for asynchronous processing' })
  @ApiCreatedResponse({ description: 'The order has been queued.' })
  async createOrder() {
    await this.ordersService.createOrder();
  }
}
