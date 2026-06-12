import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

// Unit test: no real database. We construct the service (which builds an idle
// pg pool — no socket is opened until a query) and stub $connect/$queryRaw/
// $disconnect to assert the lifecycle wiring without touching Postgres. Spies
// are held in variables so assertions don't reference unbound methods.
describe('PrismaService', () => {
  const config: Record<string, unknown> = {
    'database.url': 'postgresql://postgres:postgres@localhost:5432/workflows',
    'database.poolMax': 10,
    'database.connectionTimeoutMs': 30000,
  };
  const getOrThrow = jest.fn((key: string) => config[key]);
  const configService = { getOrThrow } as unknown as ConfigService;

  let service: PrismaService;
  let connectSpy: jest.SpyInstance;
  let queryRawSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new PrismaService(configService);
    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    queryRawSpy = jest
      .spyOn(service, '$queryRaw')
      .mockResolvedValue([{ ok: 1 }] as never);
    disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('reads connection settings from typed config (never process.env)', () => {
    expect(getOrThrow).toHaveBeenCalledWith('database.url');
    expect(getOrThrow).toHaveBeenCalledWith('database.poolMax');
    expect(getOrThrow).toHaveBeenCalledWith('database.connectionTimeoutMs');
  });

  it('connects AND probes with a real query on module init ($connect alone is lazy)', async () => {
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(queryRawSpy).toHaveBeenCalledTimes(1);
  });

  it('fails boot when the connectivity probe rejects (fail fast)', async () => {
    queryRawSpy.mockRejectedValueOnce(new Error("Can't reach database server"));
    await expect(service.onModuleInit()).rejects.toThrow(
      "Can't reach database server",
    );
  });

  it('disconnects on application shutdown (after the HTTP server drains)', async () => {
    await service.onApplicationShutdown();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
