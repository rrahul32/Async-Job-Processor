import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface PricedItem {
  price: number;
  quantity: number;
}

/**
 * Sum of `price × quantity` across items, in integer minor units (cents).
 *
 * Returns `null` when any item is malformed (missing / non-integer price or
 * quantity) — in that case we defer to the per-item validators rather than
 * emitting a misleading "amount mismatch". Both operands are integers, so the
 * product and sum stay exact (no IEEE-754 float drift).
 */
function sumItemsMinor(items: unknown): number | null {
  if (!Array.isArray(items)) {
    return null;
  }
  let total = 0;
  for (const item of items as PricedItem[]) {
    const price = item?.price;
    const quantity = item?.quantity;
    if (!Number.isInteger(price) || !Number.isInteger(quantity)) {
      return null;
    }
    total += price * quantity;
  }
  return total;
}

/**
 * Cross-field invariant: the client-supplied `amount` must equal the server's
 * independent recomputation of `Σ(price × quantity)`.
 *
 * The client total acts as a *checksum* the server re-derives and verifies —
 * "trust but verify". A mismatch means the client's cart math is wrong or the
 * payload was partially tampered with, and we reject it at the boundary (400)
 * before it can become a poison message in the durable queue.
 *
 * Note: this proves the payload is *internally consistent*, not that the prices
 * are *authoritative*. A client that changes a price and the amount together
 * still passes — true price authority requires a catalog/pricing lookup, which
 * is a later concern, not input validation.
 */
@ValidatorConstraint({ name: 'amountMatchesItems', async: false })
export class AmountMatchesItemsConstraint implements ValidatorConstraintInterface {
  validate(amount: unknown, args: ValidationArguments): boolean {
    const expected = sumItemsMinor((args.object as { items?: unknown }).items);
    // Items malformed → defer to their own validators; don't double-report.
    if (expected === null) {
      return true;
    }
    return Number.isInteger(amount) && amount === expected;
  }

  defaultMessage(args: ValidationArguments): string {
    const expected = sumItemsMinor((args.object as { items?: unknown }).items);
    return `amount (${String(args.value)}) does not match the sum of items (${String(
      expected,
    )}); amount must equal Σ(price × quantity) in minor units`;
  }
}

/**
 * Property decorator that wires {@link AmountMatchesItemsConstraint} onto a DTO
 * field so the check runs inside the global `ValidationPipe` and produces a
 * normal field-level 400 alongside any other validation errors.
 */
export function AmountMatchesItems(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: AmountMatchesItemsConstraint,
    });
  };
}
