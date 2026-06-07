import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResponseDto } from './dto/create-order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Submit an order for asynchronous processing' })
  @ApiCreatedResponse({
    description: 'The order has been validated and queued.',
    type: CreateOrderResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed (bad field, unknown field, or amount mismatch).',
  })
  @ApiServiceUnavailableResponse({
    description: 'The order could not be queued (queue backend unavailable).',
  })
  async createOrder(
    @Body() dto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    return this.ordersService.createOrder(dto);
  }
}
