import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbConnect: vi.fn(),
  kafkaStart: vi.fn(),
  kafkaStop: vi.fn(),
  listen: vi.fn(),
  serverClose: vi.fn(),
  mongooseConnect: vi.fn(),
  mongooseDisconnect: vi.fn(),
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
  productUpdateOne: vi.fn(),
}));

vi.mock('../../src/config/db.js', () => ({ default: mocks.dbConnect }));
vi.mock('../../src/config/kafka.js', () => ({
  startKafka: mocks.kafkaStart,
  stopKafka: mocks.kafkaStop,
}));
vi.mock('../../src/app.js', () => ({
  default: { listen: mocks.listen },
}));
vi.mock('mongoose', () => ({
  default: {
    connect: mocks.mongooseConnect,
    disconnect: mocks.mongooseDisconnect,
  },
}));
vi.mock('../../src/models/User.js', () => ({
  default: { findOne: mocks.userFindOne, create: mocks.userCreate },
}));
vi.mock('../../src/models/Product.js', () => ({
  default: { updateOne: mocks.productUpdateOne },
}));
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

const originalEnv = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME,
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT,
};

beforeEach(() => {
  vi.resetModules();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.dbConnect.mockResolvedValue(undefined);
  mocks.kafkaStart.mockResolvedValue(undefined);
  mocks.kafkaStop.mockResolvedValue(undefined);
  mocks.mongooseConnect.mockResolvedValue(undefined);
  mocks.mongooseDisconnect.mockResolvedValue(undefined);
  mocks.userFindOne.mockResolvedValue(null);
  mocks.userCreate.mockResolvedValue({});
  mocks.productUpdateOne.mockResolvedValue({});
  mocks.serverClose.mockImplementation((callback) => callback());
  mocks.listen.mockImplementation((port, callback) => {
    const server = { close: mocks.serverClose };
    callback();
    return server;
  });
  vi.spyOn(process, 'on').mockImplementation(() => process);
  vi.spyOn(process, 'exit').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exitCode = 0;
  process.env.MONGODB_URI = 'mongodb://unit.test/store';
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  process.exitCode = 0;
});

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('server startup and shutdown', () => {
  it('connects services, listens on the configured port, and handles shutdown signals', async () => {
    process.env.PORT = '5050';
    await import('../../src/server.js');
    await tick();

    expect(mocks.dbConnect).toHaveBeenCalledOnce();
    expect(mocks.kafkaStart).toHaveBeenCalledOnce();
    expect(mocks.listen).toHaveBeenCalledWith('5050', expect.any(Function));

    const sigint = process.on.mock.calls.find(([event]) => event === 'SIGINT')[1];
    sigint();
    await tick();

    expect(mocks.serverClose).toHaveBeenCalledOnce();
    expect(mocks.kafkaStop).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('shuts Kafka down and exits when database startup fails', async () => {
    mocks.dbConnect.mockRejectedValue(new Error('database unavailable'));
    await import('../../src/server.js');
    await tick();

    expect(console.error).toHaveBeenCalledWith('Unable to start server:', 'database unavailable');
    expect(mocks.kafkaStop).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mocks.listen).not.toHaveBeenCalled();
  });

  it('shuts Kafka down and exits when Kafka startup fails', async () => {
    mocks.kafkaStart.mockRejectedValue(new Error('broker unavailable'));
    await import('../../src/server.js');
    await tick();

    expect(console.error).toHaveBeenCalledWith('Unable to start server:', 'broker unavailable');
    expect(mocks.kafkaStop).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('catalog seed script', () => {
  it('upserts each sample product without overwriting existing catalog data', async () => {
    const log = console.info;
    await import('../../scripts/seed-products.js');

    expect(mocks.mongooseConnect).toHaveBeenCalledWith('mongodb://unit.test/store');
    expect(mocks.productUpdateOne).toHaveBeenCalledTimes(6);
    expect(mocks.productUpdateOne).toHaveBeenCalledWith(
      { sku: 'STEEL-TMT-12' },
      { $setOnInsert: expect.objectContaining({ name: 'TMT Steel Rod 12mm' }) },
      { upsert: true }
    );
    expect(log).toHaveBeenCalledWith('Seeded 6 commerce products');
    expect(mocks.mongooseDisconnect).toHaveBeenCalledOnce();
  });

  it('reports database errors, sets a failing exit code, and disconnects', async () => {
    mocks.mongooseConnect.mockRejectedValue(new Error('database unavailable'));
    await import('../../scripts/seed-products.js');

    expect(console.error).toHaveBeenCalledWith(
      'Unable to seed commerce products:',
      'database unavailable'
    );
    expect(process.exitCode).toBe(1);
    expect(mocks.mongooseDisconnect).toHaveBeenCalledOnce();
  });
});

describe('administrator provisioning script', () => {
  it('reports missing administrator credentials without connecting', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    await import('../../scripts/create-admin.js');

    expect(console.error).toHaveBeenCalledWith(
      'Unable to create administrator account:',
      'Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before creating an admin'
    );
    expect(process.exitCode).toBe(1);
    expect(mocks.mongooseConnect).not.toHaveBeenCalled();
    expect(mocks.mongooseDisconnect).toHaveBeenCalledOnce();
  });

  it('creates a normalized administrator account with the configured name', async () => {
    process.env.ADMIN_EMAIL = ' ADMIN@EXAMPLE.COM ';
    process.env.ADMIN_PASSWORD = 'admin-secret';
    process.env.ADMIN_NAME = '  Store Admin  ';
    await import('../../scripts/create-admin.js');

    expect(mocks.userFindOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
    expect(mocks.userCreate).toHaveBeenCalledWith({
      name: 'Store Admin',
      email: 'admin@example.com',
      password: 'admin-secret',
      role: 'admin',
    });
    expect(console.info).toHaveBeenCalledWith('Administrator account created for admin@example.com');
    expect(mocks.mongooseDisconnect).toHaveBeenCalledOnce();
  });

  it('promotes an existing user instead of creating a duplicate account', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'admin-secret';
    const existing = { role: 'user', save: vi.fn().mockResolvedValue(undefined) };
    mocks.userFindOne.mockResolvedValue(existing);
    await import('../../scripts/create-admin.js');

    expect(existing.role).toBe('admin');
    expect(existing.save).toHaveBeenCalledOnce();
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('Administrator access granted to admin@example.com');
  });

  it('reports database errors and always disconnects', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'admin-secret';
    mocks.mongooseConnect.mockRejectedValue(new Error('database unavailable'));
    await import('../../scripts/create-admin.js');

    expect(console.error).toHaveBeenCalledWith(
      'Unable to create administrator account:',
      'database unavailable'
    );
    expect(process.exitCode).toBe(1);
    expect(mocks.mongooseDisconnect).toHaveBeenCalledOnce();
  });
});
