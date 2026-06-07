import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AmountMatchesItems } from '../validators/amount-matches-items.validator';
import { MAX_ID_LENGTH, OrderItemDto } from './order-item.dto';

/** Max line items per order — bounds payload size and per-job work (DoS guard). */
export const MAX_ORDER_ITEMS = 100;
/** Order total ceiling in minor units: $1,000,000.00. A documented bound. */
export const MAX_ORDER_AMOUNT_MINOR = 1_000_000_00;

/**
 * Payload accepted by `POST /orders`. Validated by the global `ValidationPipe`
 * at the system boundary so a malformed order is rejected with a 400 *before*
 * it can be enqueued — keeping poison messages out of the durable queue where
 * they would otherwise be retried across every worker.
 *
 * The server, not the client, owns `orderId` and `createdAt`.
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'Customer identifier (UUID or external reference).',
    example: 'CUST-42',
    maxLength: MAX_ID_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ID_LENGTH)
  customerId: string;

  @ApiProperty({
    description: 'Line items in the order. At least one, at most 100.',
    type: [OrderItemDto],
    minItems: 1,
    maxItems: MAX_ORDER_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description:
      'Client-declared order total in minor units (cents). The server independently ' +
      'recomputes Σ(price x quantity) and rejects the request if it disagrees.',
    example: 3998,
    minimum: 0,
    maximum: MAX_ORDER_AMOUNT_MINOR,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_ORDER_AMOUNT_MINOR)
  @AmountMatchesItems()
  amount: number;
}
