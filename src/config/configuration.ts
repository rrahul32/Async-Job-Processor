export interface ApplicationConfiguration {
  app: {
    port: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  database: {
    /** PostgreSQL connection string consumed by the pg driver adapter. */
    url: string;
    /**
     * Max connections in the pg pool *per process*. Bounds DB load: with N
     * workers, total connections = N × poolMax and must stay under Postgres
     * `max_connections` (default 100). At real scale a pooler (PgBouncer) sits
     * in front; this cap is the per-instance guard.
     */
    poolMax: number;
    /**
     * Time (ms) to wait for a free connection before failing. pg defaults to 0
     * (wait forever) — we set a real timeout so a saturated pool surfaces a
     * fast error (backpressure) instead of hanging requests.
     */
    connectionTimeoutMs: number;
  };
}

/** Single integer-env parsing pipeline; getPort/getPositiveInt are bounds presets. */
function getBoundedInt(
  name: string,
  defaultValue: number,
  max: number,
  errorMessage: string,
): number {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function getPort(name: string, defaultValue: number): number {
  return getBoundedInt(
    name,
    defaultValue,
    65535,
    `${name} must be a valid port number`,
  );
}

/** Parse a positive-integer env var (e.g. pool size, timeout), with a default. */
function getPositiveInt(name: string, defaultValue: number): number {
  return getBoundedInt(
    name,
    defaultValue,
    Number.MAX_SAFE_INTEGER,
    `${name} must be a positive integer`,
  );
}

/**
 * DATABASE_URL is REQUIRED — no fallback, by deliberate decision. A default
 * connection string (even a localdev one) means a misconfigured environment
 * silently targets the wrong database; a missing variable must be a loud,
 * unambiguous boot failure instead. Local dev sets it once via
 * `cp .env.example .env`. (The Redis password keeps its zero-config default
 * because empty-vs-unset is semantically meaningful there and the wrong-target
 * write hazard doesn't exist.)
 */
function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      'DATABASE_URL is required (for local development: cp .env.example .env)',
    );
  }

  return value;
}

export default (): ApplicationConfiguration => ({
  app: {
    port: getPort('PORT', 3000),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: getPort('REDIS_PORT', 6379),
    // Redis auth. Unset → the Compose stack's local-dev password (zero-config
    // boot); set REDIS_PASSWORD for your own Redis; set it empty (REDIS_PASSWORD=)
    // to disable auth for a bring-your-own Redis that requires none — ioredis
    // sends no AUTH for an empty password. `??` (not `||`) keeps the explicit
    // empty string instead of falling back to the default.
    password: process.env.REDIS_PASSWORD ?? 'localdev_redis_pw',
  },
  database: {
    url: getDatabaseUrl(),
    poolMax: getPositiveInt('DATABASE_POOL_MAX', 10),
    connectionTimeoutMs: getPositiveInt(
      'DATABASE_CONNECTION_TIMEOUT_MS',
      30000,
    ),
  },
});
