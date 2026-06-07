export interface ApplicationConfiguration {
  app: {
    port: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
}

function getPort(name: string, defaultValue: number): number {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid port number`);
  }

  return port;
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
});
