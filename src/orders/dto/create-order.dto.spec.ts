import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateOrderDto, MAX_ORDER_ITEMS } from './create-order.dto';

/** Mirror the production policy: reject unknown fields, validate nested. */
const VALIDATOR_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

function validateOrder(
  plain: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(CreateOrderDto, plain), VALIDATOR_OPTIONS);
}

/** Top-level property names that produced at least one error. */
function failedProps(errors: ValidationError[]): Set<string> {
  return new Set(errors.map((e) => e.property));
}

/** Every constraint key in the tree (top-level + nested children). */
function allConstraints(errors: ValidationError[]): Set<string> {
  const keys = new Set<string>();
  const walk = (errs: ValidationError[]) => {
    for (const e of errs) {
      Object.keys(e.constraints ?? {}).forEach((k) => keys.add(k));
      if (e.children?.length) walk(e.children);
    }
  };
  walk(errors);
  return keys;
}

const validOrder = () => ({
  customerId: 'CUST-42',
  items: [
    { productId: 'SKU-1001', quantity: 2, price: 1999 }, // 3998
    { productId: 'SKU-2002', quantity: 1, price: 500 }, // 500
  ],
  amount: 4498, // 3998 + 500
});

describe('CreateOrderDto validation', () => {
  it('accepts a well-formed order with a matching amount', async () => {
    expect(await validateOrder(validOrder())).toHaveLength(0);
  });

  describe('customerId', () => {
    it('rejects a missing customerId', async () => {
      const { items, amount } = validOrder();
      expect(failedProps(await validateOrder({ items, amount }))).toContain(
        'customerId',
      );
    });

    it('rejects an empty customerId', async () => {
      const errors = await validateOrder({ ...validOrder(), customerId: '' });
      expect(allConstraints(errors)).toContain('isNotEmpty');
    });

    it('rejects a customerId over the length cap', async () => {
      const errors = await validateOrder({
        ...validOrder(),
        customerId: 'x'.repeat(65),
      });
      expect(allConstraints(errors)).toContain('maxLength');
    });
  });

  describe('items', () => {
    it('rejects an empty items array', async () => {
      const errors = await validateOrder({
        ...validOrder(),
        items: [],
        amount: 0,
      });
      expect(allConstraints(errors)).toContain('arrayMinSize');
    });

    it('rejects more than the per-order item cap', async () => {
      const items = Array.from({ length: MAX_ORDER_ITEMS + 1 }, () => ({
        productId: 'SKU-1',
        quantity: 1,
        price: 1,
      }));
      const errors = await validateOrder({
        ...validOrder(),
        items,
        amount: MAX_ORDER_ITEMS + 1,
      });
      expect(allConstraints(errors)).toContain('arrayMaxSize');
    });

    it('rejects a non-integer (float) quantity', async () => {
      const errors = await validateOrder({
        customerId: 'CUST-1',
        items: [{ productId: 'SKU-1', quantity: 1.5, price: 1000 }],
        amount: 1500,
      });
      expect(allConstraints(errors)).toContain('isInt');
    });

    it('rejects a zero quantity', async () => {
      const errors = await validateOrder({
        customerId: 'CUST-1',
        items: [{ productId: 'SKU-1', quantity: 0, price: 1000 }],
        amount: 0,
      });
      expect(allConstraints(errors)).toContain('min');
    });

    it('rejects a non-integer (float) price', async () => {
      const errors = await validateOrder({
        customerId: 'CUST-1',
        items: [{ productId: 'SKU-1', quantity: 1, price: 19.99 }],
        amount: 20,
      });
      expect(allConstraints(errors)).toContain('isInt');
    });

    it('rejects a negative price', async () => {
      const errors = await validateOrder({
        customerId: 'CUST-1',
        items: [{ productId: 'SKU-1', quantity: 1, price: -100 }],
        amount: -100,
      });
      expect(allConstraints(errors)).toContain('min');
    });
  });

  describe('amount checksum (trust-but-verify)', () => {
    it('rejects an amount that does not equal Σ(price × quantity)', async () => {
      const errors = await validateOrder({ ...validOrder(), amount: 9999 });
      expect(allConstraints(errors)).toContain('amountMatchesItems');
    });

    it('accepts the exact integer sum (no float drift)', async () => {
      // 3 × 10 cents = 30; a float sum of 0.1×3 would drift, integers do not.
      const errors = await validateOrder({
        customerId: 'CUST-1',
        items: [{ productId: 'SKU-1', quantity: 3, price: 10 }],
        amount: 30,
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects a missing amount', async () => {
      const { customerId, items } = validOrder();
      expect(failedProps(await validateOrder({ customerId, items }))).toContain(
        'amount',
      );
    });
  });

  it('rejects unknown / smuggled top-level properties (deny-by-default)', async () => {
    const errors = await validateOrder({
      ...validOrder(),
      isAdmin: true,
      internalDiscount: 100,
    });
    expect(allConstraints(errors)).toContain('whitelistValidation');
  });
});
