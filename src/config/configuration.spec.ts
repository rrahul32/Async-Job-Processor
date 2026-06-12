import configuration from './configuration';

describe('configuration', () => {
  const initialEnv = process.env;
  // DATABASE_URL has no default (required), so the baseline provides one;
  // the required-throw tests delete it explicitly.
  const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/workflows';

  beforeEach(() => {
    process.env = { ...initialEnv };
    delete process.env.PORT;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.DATABASE_POOL_MAX;
    delete process.env.DATABASE_CONNECTION_TIMEOUT_MS;
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  afterAll(() => {
    process.env = initialEnv;
  });

  it('provides local development defaults (DATABASE_URL itself has none — it is required)', () => {
    expect(configuration()).toEqual({
      app: { port: 3000 },
      redis: { host: 'localhost', port: 6379, password: 'localdev_redis_pw' },
      database: {
        url: TEST_DATABASE_URL,
        poolMax: 10,
        connectionTimeoutMs: 30000,
      },
    });
  });

  it('reads configured application, Redis, and database settings', () => {
    process.env.PORT = '4000';
    process.env.REDIS_HOST = 'redis';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 's3cret';
    process.env.DATABASE_URL = 'postgresql://user:pw@db:5432/prod';
    process.env.DATABASE_POOL_MAX = '25';
    process.env.DATABASE_CONNECTION_TIMEOUT_MS = '5000';

    expect(configuration()).toEqual({
      app: { port: 4000 },
      redis: { host: 'redis', port: 6380, password: 's3cret' },
      database: {
        url: 'postgresql://user:pw@db:5432/prod',
        poolMax: 25,
        connectionTimeoutMs: 5000,
      },
    });
  });

  it('rejects a non-positive database pool size', () => {
    process.env.DATABASE_POOL_MAX = '0';

    expect(() => configuration()).toThrow(
      'DATABASE_POOL_MAX must be a positive integer',
    );
  });

  it('throws when DATABASE_URL is unset — required, no silent default', () => {
    delete process.env.DATABASE_URL;

    expect(() => configuration()).toThrow('DATABASE_URL is required');
  });

  it('throws when DATABASE_URL is explicitly empty (broken templating)', () => {
    process.env.DATABASE_URL = '';

    expect(() => configuration()).toThrow('DATABASE_URL is required');
  });

  it('treats an explicit empty REDIS_PASSWORD as "no auth"', () => {
    // Empty string must be kept (not coalesced to the default) so a
    // bring-your-own Redis with no password works — ioredis sends no AUTH.
    process.env.REDIS_PASSWORD = '';

    expect(configuration().redis.password).toBe('');
  });

  it('rejects an invalid configured port', () => {
    process.env.REDIS_PORT = 'redis-port';

    expect(() => configuration()).toThrow(
      'REDIS_PORT must be a valid port number',
    );
  });
});
