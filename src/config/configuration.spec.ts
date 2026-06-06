import configuration from './configuration';

describe('configuration', () => {
  const initialEnv = process.env;

  beforeEach(() => {
    process.env = { ...initialEnv };
    delete process.env.PORT;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });

  afterAll(() => {
    process.env = initialEnv;
  });

  it('provides local development defaults', () => {
    expect(configuration()).toEqual({
      app: { port: 3000 },
      redis: { host: 'localhost', port: 6379 },
    });
  });

  it('reads configured application and Redis settings', () => {
    process.env.PORT = '4000';
    process.env.REDIS_HOST = 'redis';
    process.env.REDIS_PORT = '6380';

    expect(configuration()).toEqual({
      app: { port: 4000 },
      redis: { host: 'redis', port: 6380 },
    });
  });

  it('rejects an invalid configured port', () => {
    process.env.REDIS_PORT = 'redis-port';

    expect(() => configuration()).toThrow(
      'REDIS_PORT must be a valid port number',
    );
  });
});
