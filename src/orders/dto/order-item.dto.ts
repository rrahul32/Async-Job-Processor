import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Upper bound on an ID string — bounds payload size (DoS guard). */
export const MAX_ID_LENGTH = 64;
/** Per-line quantity ceiling — a deliberate, documented bound, not a business rule. */
export const MAX_ITEM_QUANTITY = 10_000;
/** Per-unit price ceiling in minor units: $100,000.00 = 100_000_00 cents. */
export const MAX_ITEM_PRICE_MINOR = 100_000_00;

/**
 * A single line item in an order. `price` is in integer **minor units** (cents)
 * so all money arithmetic is exact — no IEEE-754 float drift when prices are
 * summed across thousands of orders.
 */
export class OrderItemDto {
  @ApiProperty({
    description:
      'Product identifier (UUID, SKU, or external catalog reference).',
    example: 'SKU-1001',
    maxLength: MAX_ID_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ID_LENGTH)
  productId: string;

  @ApiProperty({
    description: 'Whole number of units ordered for this line.',
    example: 2,
    minimum: 1,
    maximum: MAX_ITEM_QUANTITY,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity: number;

  @ApiProperty({
    description:
      'Unit price in minor units (cents). 1999 = $19.99. Integer only — no fractional cents.',
    example: 1999,
    minimum: 0,
    maximum: MAX_ITEM_PRICE_MINOR,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_ITEM_PRICE_MINOR)
  price: number;
}
