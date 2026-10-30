import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  productFind: vi.fn(),
  inventoryFind: vi.fn(),
  inventoryFindById: vi.fn(),
  inventoryCreate: vi.fn(),
  connect: vi.fn(),
  producerConnect: vi.fn(),
  producerDisconnect: vi.fn(),
  producerSend: vi.fn(),
  consumerConnect: vi.fn(),
  consumerDisconnect: vi.fn(),
  consumerSubscribe: vi.fn(),
  consumerRun: vi.fn(),
  eachMessage: null,
}));

vi.mock('../../src/models/Product.js', () => ({
  default: { find: mocks.productFind },
}));
vi.mock('../../src/models/InventoryItem.js', () => ({
  default: {
    find: mocks.inventoryFind,
    findById: mocks.inventoryFindById,
    create: mocks.inventoryCreate,
  },
}));

vi.mock('kafkajs', () => ({
  Kafka: vi.fn(function KafkaMock(options) {
    mocks.connect(options);
    this.producer = () => ({
      connect: mocks.producerConnect,
      disconnect: mocks.producerDisconnect,
      send: mocks.producerSend,
    });
    this.consumer = () => ({
      connect: mocks.consumerConnect,
      disconnect: mocks.consumerDisconnect,
      subscribe: mocks.consumerSubscribe,
      run: mocks.consumerRun.mockImplementation(({ eachMessage }) => {
        mocks.eachMessage = eachMessage;
      }),
    });
  }),
  logLevel: { WARN: 4 },
}));

import app from '../../src/app.js';
import connectDB from '../../src/config/db.js';
import {
  getKafkaStatus,
  publishCommerceEvent,
  startKafka,
  stopKafka,
} from '../../src/config/kafka.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.productFind.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ name: 'Pipe' }]) });
  mocks.inventoryFindById.mockResolvedValue(null);
  mocks.producerConnect.mockResolvedValue(undefined);
  mocks.producerDisconnect.mockResolvedValue(undefined);
  mocks.producerSend.mockResolvedValue(undefined);
  mocks.consumerConnect.mockResolvedValue(undefined);
  mocks.consumerDisconnect.mockResolvedValue(undefined);
  mocks.consumerSubscribe.mockResolvedValue(undefined);
  mocks.consumerRun.mockResolvedValue(undefined);
  process.env.KAFKA_ENABLED = 'false';
});

afterEach(async () => {
  await stopKafka();
  delete process.env.KAFKA_ENABLED;
  delete process.env.KAFKA_BROKERS;
  delete process.env.KAFKA_TOPIC;
  delete process.env.KAFKA_CLIENT_ID;
  delete process.env.KAFKA_GROUP_ID;
});

describe('database configuration', () => {
  it('connects using the configured database URI', async () => {
    const mongoose = await import('mongoose');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(mongoose.default, 'connect').mockResolvedValue({
      connection: { host: 'mongo.test' },
    });
    process.env.MONGODB_URI = 'mongodb://mongo.test/store';

    await connectDB();

    expect(mongoose.default.connect).toHaveBeenCalledWith('mongodb://mongo.test/store');
    expect(log).toHaveBeenCalledWith('MongoDB connected successfully: mongo.test');
    delete process.env.MONGODB_URI;
  });

  it('logs connection errors and exits when MongoDB cannot be reached', async () => {
    const mongoose = await import('mongoose');
    const error = new Error('connection refused');
    vi.spyOn(mongoose.default, 'connect').mockRejectedValue(error);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    await connectDB();

    expect(log).toHaveBeenCalledWith('MongoDB connection error:', 'connection refused');
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('Kafka configuration', () => {
  it('reports disabled status and skips setup when Kafka is disabled', async () => {
    await startKafka();

    expect(getKafkaStatus()).toEqual({ enabled: false, connected: false });
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('connects the producer and consumer, then publishes commerce events', async () => {
    process.env.KAFKA_ENABLED = 'true';
    process.env.KAFKA_BROKERS = 'broker-1:9092, broker-2:9092';
    process.env.KAFKA_TOPIC = 'test.events';
    process.env.KAFKA_CLIENT_ID = 'test-client';
    process.env.KAFKA_GROUP_ID = 'test-group';

    await startKafka();
    expect(getKafkaStatus()).toEqual({ enabled: true, connected: true });
    expect(mocks.connect).toHaveBeenCalledWith(expect.objectContaining({
      brokers: ['broker-1:9092', 'broker-2:9092'],
      clientId: 'test-client',
    }));
    expect(mocks.consumerSubscribe).toHaveBeenCalledWith({
      topic: 'test.events',
      fromBeginning: false,
    });

    await publishCommerceEvent('order.created', { id: 'order-1' });
    const published = JSON.parse(mocks.producerSend.mock.calls[0][0].messages[0].value);
    expect(mocks.producerSend.mock.calls[0][0].topic).toBe('test.events');
    expect(published).toMatchObject({
      type: 'order.created',
      payload: { id: 'order-1' },
    });
    expect(published.eventId).toBeTruthy();

    await stopKafka();
    expect(getKafkaStatus().connected).toBe(false);
    expect(mocks.producerDisconnect).toHaveBeenCalledOnce();
    expect(mocks.consumerDisconnect).toHaveBeenCalledOnce();
  });

  it('rejects an empty configured broker list', async () => {
    process.env.KAFKA_ENABLED = 'true';
    process.env.KAFKA_BROKERS = ', ';

    await expect(startKafka()).rejects.toThrow('KAFKA_BROKERS must contain at least one broker');
  });

  it('logs malformed events received by the consumer without crashing', async () => {
    process.env.KAFKA_ENABLED = 'true';
    await startKafka();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await mocks.eachMessage({ message: { value: Buffer.from('{invalid') } });

    expect(error).toHaveBeenCalledWith(
      'Unable to parse Kafka commerce event:',
      expect.any(String)
    );
  });

  it('logs broker publish failures without rejecting the request', async () => {
    process.env.KAFKA_ENABLED = 'true';
    await startKafka();
    mocks.producerSend.mockRejectedValue(new Error('broker down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(publishCommerceEvent('product.created', { id: 'product-1' }))
      .resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      'Unable to publish Kafka event "product.created":',
      'broker down'
    );
  });
});

describe('Express app routes', () => {
  it('returns health information and handles unknown paths', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body).toMatchObject({
      success: true,
      message: 'Commerce API is running',
      kafka: { enabled: false, connected: false },
    });

    const missing = await request(app).get('/not-found').expect(404);
    expect(missing.body).toEqual({ success: false, message: 'Route not found' });
  });

  it('serves the public catalog and protects product administration and orders', async () => {
    const products = await request(app).get('/api/v1/products?category=hardware').expect(200);
    expect(products.body.data).toEqual([{ name: 'Pipe' }]);
    expect(mocks.productFind).toHaveBeenCalledWith({ isActive: true, category: 'hardware' });

    await request(app).post('/api/v1/products').send({}).expect(401);
    await request(app).get('/api/v1/orders').expect(401);
  });

  it('mounts authentication and inventory endpoints', async () => {
    const signup = await request(app).post('/api/v1/auth/signup').send({}).expect(400);
    expect(signup.body.message).toBe('Please correct the registration details');
    expect(signup.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name' }),
      expect.objectContaining({ field: 'email' }),
      expect.objectContaining({ field: 'password' }),
    ]));

    mocks.inventoryFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{ sku: 'PIPE-1' }]),
    });
    const inventory = await request(app).get('/api/v1/inventory').expect(200);
    expect(inventory.body.data).toEqual([{ sku: 'PIPE-1' }]);

    const missing = await request(app).get('/api/v1/inventory/507f1f77bcf86cd799439011').expect(404);
    expect(missing.body.success).toBe(false);
  });

  it('returns a clear client error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request body contains invalid JSON');
  });
});
