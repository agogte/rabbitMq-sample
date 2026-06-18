// src/rabbitmq.js
const amqp = require("amqplib");

class RabbitMQBuilder {
  constructor() {
    this.url = null;
    this.queue = null;
    this.queueOptions = {};
    this.deadLetter = null;
    this.connection = null;
    this.channel = null;
  }

  withUrl(url) {
    this.url = url;
    return this;
  }

  withQueue(queue, options = {}) {
    this.queue = queue;
    this.queueOptions = options;
    return this;
  }

  // NEW: Configure a dead-letter exchange/queue for messages that are
  // nacked with requeue=false (e.g. after processing failures).
  withDeadLetter({ exchange, routingKey, queue }) {
    this.deadLetter = { exchange, routingKey, queue };
    this.queueOptions = {
      ...this.queueOptions,
      arguments: {
        ...(this.queueOptions.arguments || {}),
        "x-dead-letter-exchange": exchange,
        "x-dead-letter-routing-key": routingKey,
      },
    };
    return this;
  }

  async connect() {
    if (this.connection && this.channel) return;

    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(this.queue, this.queueOptions);

    if (this.deadLetter) {
      const { exchange, routingKey, queue } = this.deadLetter;
      await this.channel.assertExchange(exchange, "direct", { durable: true });
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);
      console.log(`[RabbitMQ] Dead-letter queue ready: ${queue}`);
    }

    console.log(`[RabbitMQ] Connected to queue: ${this.queue}`);
  }

  // NEW: Retry connection
  async connectWithRetry({ retries = 15, delayMs = 3000 } = {}) {
    for (let i = 1; i <= retries; i++) {
      try {
        await this.connect();
        console.log(`[RabbitMQ] Connected (attempt ${i})`);
        return;
      } catch (err) {
        console.warn(
          `[RabbitMQ] Connection failed (attempt ${i}/${retries}):`,
          err.message
        );
        if (i === retries) throw err;
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  getChannel() {
    if (!this.channel) throw new Error("RabbitMQ channel not initialized");
    return this.channel;
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log("[RabbitMQ] Connection closed");
  }

  build() {
    return this;
  }
}

module.exports = { RabbitMQBuilder };
