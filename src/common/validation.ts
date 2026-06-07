import { ValidationPipeOptions } from '@nestjs/common';

/**
 * Single source of truth for the global request-validation policy.
 *
 * Shared by `main.ts` (the real bootstrap) and the e2e tests so the two can
 * never drift — a test that passes against laxer rules than production would be
 * worse than no test at all.
 *
 * - `whitelist` — strip any property not declared on the DTO.
 * - `forbidNonWhitelisted` — go further and *reject* (400) unknown properties.
 *   Deny-by-default: a client cannot smuggle extra fields (mass-assignment
 *   defense). Without it, an attacker could set fields the server never meant
 *   to accept once those DTOs grow.
 * - `transform` — return the validated DTO *class instance* to the handler
 *   (not the raw body), and coerce primitive `@Param`/`@Query` types. Note:
 *   nested validation runs even without this — the pipe always builds a class
 *   instance internally to validate; `transform` only controls the returned
 *   value. We keep it on so the service receives real DTO instances.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
