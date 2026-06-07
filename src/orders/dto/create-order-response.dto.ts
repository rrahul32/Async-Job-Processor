import { ApiProperty } from '@nestjs/swagger';

/** Response body for a successfully queued order (HTTP 201). */
export class CreateOrderResponseDto {
  @ApiProperty({
    description: 'Server-generated order identifier (UUID v4).',
    example: 'b1f7c0de-1234-4abc-8def-0123456789ab',
  })
  orderId: string;

  @ApiProperty({
    description: 'Lifecycle status of the order at acceptance time.',
    example: 'queued',
    enum: ['queued'],
  })
  status: 'queued';
}
