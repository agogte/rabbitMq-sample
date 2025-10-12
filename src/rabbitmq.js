const amqp = require("amqplib");

class RabbitMQ {
  constructor({ url, queueName, queueOptions }) {
    this.url = url;
    this.queueName = queueName;
    this.queueOptions = queueOptions;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    if (this.connection && this.channel) {
      return this.channel;
    }

    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      if (this.queueName) {
        await this.channel.assertQueue(this.queueName, this.queueOptions);
      }
      console.log(`Connected to RabbitMQ at ${this.url}`);
      return this.channel;
    } catch (error) {
      console.error("RabbitMQ connection error:", error.message);
      throw new Error("Failed to connect to RabbitMQ");
    }
  }

  async getChannel() {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    console.log("RabbitMQ connection closed");
  }
}

class RabbitMQBuilder {
  constructor() {
    this.url = "amqp://localhost"; // Default URL
    this.queueName = null;
    this.queueOptions = { durable: true }; // Default to durable queue
  }

  withUrl(url) {
    this.url = url;
    return this;
  }

  withQueue(queueName, queueOptions = { durable: true }) {
    this.queueName = queueName;
    this.queueOptions = { ...this.queueOptions, ...queueOptions };
    return this;
  }

  build() {
    if (!this.url) {
      throw new Error("RabbitMQ URL must be specified");
    }
    return new RabbitMQ({
      url: this.url,
      queueName: this.queueName,
      queueOptions: this.queueOptions,
    });
  }
}

module.exports = { RabbitMQBuilder };
