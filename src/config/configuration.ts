export interface ApplicationConfiguration {
  app: {
    port: number;
  };
  redis: {
    host: string;
    port: number;
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
  },
});
