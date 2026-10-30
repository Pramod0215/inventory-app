import { Kafka, logLevel } from 'kafkajs';
import { randomUUID } from 'node:crypto';

const getTopic = () => process.env.KAFKA_TOPIC || 'commerce.events';
let producer;
let consumer;
let connected = false;

const isKafkaEnabled = () => process.env.KAFKA_ENABLED === 'true';

const startKafka = async () => {
  if (!isKafkaEnabled()) {
    console.info('Kafka integration is disabled');
    return;
  }

  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS must contain at least one broker');
  }

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'commerce-api',
    brokers,
    logLevel: logLevel.WARN,
  });

  producer = kafka.producer();
  consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'commerce-event-consumers',
  });

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: getTopic(), fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const event = JSON.parse(message.value.toString());
        console.info('Commerce event consumed:', {
          type: event.type,
          eventId: event.eventId,
        });
      } catch (error) {
        console.error('Unable to parse Kafka commerce event:', error.message);
      }
    },
  });

  connected = true;
  console.info(`Kafka connected: ${brokers.join(', ')}`);
};

const publishCommerceEvent = async (type, payload) => {
  if (!isKafkaEnabled()) return;

  if (!connected || !producer) {
    console.error(`Kafka is unavailable; event "${type}" was not published`);
    return;
  }

  const event = {
    eventId: randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  };

  try {
    await producer.send({
      topic: getTopic(),
      messages: [{ key: payload.id || event.eventId, value: JSON.stringify(event) }],
    });
  } catch (error) {
    console.error(`Unable to publish Kafka event "${type}":`, error.message);
  }
};

const stopKafka = async () => {
  connected = false;
  const clients = [producer, consumer].filter(Boolean);
  await Promise.all(clients.map((client) => client.disconnect()));
};

const getKafkaStatus = () => ({
  enabled: isKafkaEnabled(),
  connected,
});

export { getKafkaStatus, publishCommerceEvent, startKafka, stopKafka };
